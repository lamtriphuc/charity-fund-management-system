import { ConflictException, ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { Role } from '../users/entities/role.entity';
import { OAuth2Client } from 'google-auth-library';
import { RoleName } from '../users/dto/user.dto';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditLogSeverity, AuditLogStatus } from '../audit/dto/create-audit-log.dto';

@Injectable()
export class AuthService {
    private googleClient: OAuth2Client;

    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        private readonly auditLogService: AuditLogService,
        private jwtService: JwtService,
        private configService: ConfigService
    ) {
        this.googleClient = new OAuth2Client(this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'));
    }

    private async getTokens(userId: string, email: string, role: string, permissions: string[]) {
        const payload = { sub: userId, email, role, permissions };

        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
                expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRATION') as any
            }),
            this.jwtService.signAsync(payload, {
                secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
                expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION') as any
            })
        ]);

        return { accessToken, refreshToken };
    }

    private async updateRefreshToken(userId: string, refreshToken: string) {
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.userRepository.update(userId, { refreshToken: hashedRefreshToken });
    }

    async register(dto: RegisterDto) {
        const existingUser = await this.userRepository.findOne({ where: { email: dto.email } });
        if (existingUser) throw new ConflictException('Email đã tồn tại');

        const defaultRole = await this.roleRepository.findOne({
            where: { name: RoleName.DONOR }
        });

        if (!defaultRole) {
            throw new InternalServerErrorException('Lỗi hệ thống: Không tìm thấy Role mặc định');
        }

        const hashedPassword = await bcrypt.hash(dto.password, 10);

        const newUser = this.userRepository.create({
            email: dto.email,
            hashedPassword,
            fullName: dto.fullName,
            role: defaultRole
        });

        await this.userRepository.save(newUser);
        return { message: 'Đăng ký thành công' }
    }

    async login(
        dto: LoginDto,
        requestInfo: {
            ipAddress?: string | null;
            userAgent?: string | null;
        },
    ) {
        const user = await this.userRepository.findOne({
            where: { email: dto.email }, relations: ['role']
        });

        if (!user) {
            await this.auditLogService.log({
                actorId: 'anonymous',
                actorEmail: dto.email,
                actorRole: 'GUEST',
                action: 'LOGIN_FAILED',
                entity: 'AUTH',
                entityId: null,
                metadata: {
                    reason: 'USER_NOT_FOUND',
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                status: AuditLogStatus.FAILED,
                severity: AuditLogSeverity.WARN,
            });

            throw new UnauthorizedException('Sai email hoặc mật khẩu');
        }

        if (user.status === 'BLOCKED') {
            await this.auditLogService.log({
                actorId: user.id,
                actorEmail: user.email,
                actorRole: user.role?.name || RoleName.DONOR,
                action: 'LOGIN_BLOCKED',
                entity: 'AUTH',
                entityId: user.id,
                metadata: {
                    reason: 'ACCOUNT_BLOCKED',
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                status: AuditLogStatus.FAILED,
                severity: AuditLogSeverity.WARN,
            });

            throw new ForbiddenException('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin.');
        }

        const isPasswordValid = await bcrypt.compare(
            dto.password,
            user.hashedPassword,
        );

        if (!isPasswordValid) {
            await this.auditLogService.log({
                actorId: user.id,
                actorEmail: user.email,
                actorRole: user.role?.name || RoleName.DONOR,
                action: 'LOGIN_FAILED',
                entity: 'AUTH',
                entityId: user.id,
                metadata: {
                    reason: 'INVALID_PASSWORD',
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                status: AuditLogStatus.FAILED,
                severity: AuditLogSeverity.WARN,
            });

            throw new UnauthorizedException('Sai email hoặc mật khẩu');
        }


        const roleName = user.role?.name || RoleName.DONOR;
        const permissions = user.role?.permissions || [];

        const tokens = await this.getTokens(user.id, user.email, roleName, permissions);

        await this.updateRefreshToken(user.id, tokens.refreshToken);

        await this.auditLogService.log({
            actorId: user.id,
            actorEmail: user.email,
            actorRole: roleName,
            action: 'LOGIN_SUCCESS',
            entity: 'AUTH',
            entityId: user.id,
            metadata: {
                method: 'PASSWORD',
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.INFO,
        });

        return {
            ...tokens,
            user: { id: user.id, fullName: user.fullName, email: user.email, role: roleName, permissions, avatar: user.avatarUrl }
        };
    }

    async logout(userId: string) {
        // Xóa refresh token dưới DB
        await this.userRepository.update(userId, { refreshToken: null });
        return { message: 'Đăng xuất thành công' };
    }

    async refreshTokens(userId: string, refreshToken: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId }, relations: ['role']
        });

        // So sánh token client gửi lên với token lưu trong DB
        if (!user || !user.refreshToken) throw new ForbiddenException('Truy cập bị từ chối');
        if (user.status === 'BLOCKED') throw new ForbiddenException('Tài khoản của bạn đã bị khóa.');

        const isRtMatches = await bcrypt.compare(refreshToken, user.refreshToken);
        if (!isRtMatches) throw new ForbiddenException('Refresh Token không hợp lệ');

        const roleName = user.role?.name || RoleName.DONOR;
        const permissions = user.role?.permissions || [];

        const tokens = await this.getTokens(user.id, user.email, roleName, permissions);
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }

    async googleLogin(
        idToken: string,
        requestInfo: {
            ipAddress?: string | null;
            userAgent?: string | null;
        },
    ) {
        try {
            // 1. Xác thực token với Google Server
            const ticket = await this.googleClient.verifyIdToken({
                idToken: idToken,
                audience: this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID'),
            });

            const payload = ticket.getPayload();

            if (!payload || !payload.email) {
                await this.auditLogService.log({
                    actorId: 'anonymous',
                    actorEmail: null,
                    actorRole: 'GUEST',
                    action: 'GOOGLE_LOGIN_FAILED',
                    entity: 'AUTH',
                    entityId: null,
                    metadata: {
                        reason: 'INVALID_GOOGLE_TOKEN',
                    },
                    ipAddress: requestInfo.ipAddress,
                    userAgent: requestInfo.userAgent,
                    status: AuditLogStatus.FAILED,
                    severity: AuditLogSeverity.WARN,
                });

                throw new UnauthorizedException('Token Google không hợp lệ');
            }

            const { email, name, picture } = payload;

            let user = await this.userRepository.findOne({
                where: { email },
                relations: ['role'],
            });

            let isNewUser = false;

            if (!user) {
                const defaultRole = await this.roleRepository.findOne({
                    where: { name: RoleName.DONOR },
                });

                if (!defaultRole) {
                    await this.auditLogService.log({
                        actorId: 'SYSTEM',
                        actorEmail: email,
                        actorRole: 'SYSTEM',
                        action: 'GOOGLE_REGISTER_FAILED',
                        entity: 'AUTH',
                        entityId: null,
                        metadata: {
                            reason: 'DEFAULT_ROLE_NOT_FOUND',
                        },
                        ipAddress: requestInfo.ipAddress,
                        userAgent: requestInfo.userAgent,
                        status: AuditLogStatus.FAILED,
                        severity: AuditLogSeverity.CRITICAL,
                    });

                    throw new InternalServerErrorException('Không tìm thấy Role mặc định');
                }

                const randomPassword = await bcrypt.hash(
                    Math.random().toString(36).slice(-10),
                    10,
                );

                user = this.userRepository.create({
                    email,
                    fullName: name,
                    avatarUrl: picture,
                    hashedPassword: randomPassword,
                    role: defaultRole,
                });

                user = await this.userRepository.save(user);
                isNewUser = true;

                await this.auditLogService.log({
                    actorId: user.id,
                    actorEmail: user.email,
                    actorRole: defaultRole.name,
                    action: 'GOOGLE_REGISTER_SUCCESS',
                    entity: 'USER',
                    entityId: user.id,
                    before: null,
                    after: {
                        id: user.id,
                        email: user.email,
                        fullName: user.fullName,
                        role: defaultRole.name,
                        avatarUrl: user.avatarUrl,
                    },
                    metadata: {
                        provider: 'GOOGLE',
                    },
                    ipAddress: requestInfo.ipAddress,
                    userAgent: requestInfo.userAgent,
                    status: AuditLogStatus.SUCCESS,
                    severity: AuditLogSeverity.INFO,
                });
            }

            if (user.status === 'BLOCKED') {
                await this.auditLogService.log({
                    actorId: user.id,
                    actorEmail: user.email,
                    actorRole: user.role?.name || RoleName.DONOR,
                    action: 'GOOGLE_LOGIN_BLOCKED',
                    entity: 'AUTH',
                    entityId: user.id,
                    metadata: {
                        reason: 'ACCOUNT_BLOCKED',
                        provider: 'GOOGLE',
                    },
                    ipAddress: requestInfo.ipAddress,
                    userAgent: requestInfo.userAgent,
                    status: AuditLogStatus.FAILED,
                    severity: AuditLogSeverity.WARN,
                });

                throw new ForbiddenException('Tài khoản của bạn đã bị khóa.');
            }

            const roleName = user.role?.name || RoleName.DONOR;
            const permissions = user.role?.permissions || [];

            const tokens = await this.getTokens(
                user.id,
                user.email,
                roleName,
                permissions,
            );

            await this.updateRefreshToken(user.id, tokens.refreshToken);

            await this.auditLogService.log({
                actorId: user.id,
                actorEmail: user.email,
                actorRole: roleName,
                action: 'GOOGLE_LOGIN_SUCCESS',
                entity: 'AUTH',
                entityId: user.id,
                metadata: {
                    provider: 'GOOGLE',
                    isNewUser,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                status: AuditLogStatus.SUCCESS,
                severity: AuditLogSeverity.INFO,
            });

            return {
                ...tokens,
                user: {
                    id: user.id,
                    fullName: user.fullName,
                    email: user.email,
                    role: roleName,
                    permissions,
                    avatar: user.avatarUrl,
                },
            };

        } catch (error) {
            console.error(error)
            if (
                error instanceof UnauthorizedException ||
                error instanceof ForbiddenException ||
                error instanceof InternalServerErrorException
            ) {
                throw error;
            }

            await this.auditLogService.log({
                actorId: 'anonymous',
                actorEmail: null,
                actorRole: 'GUEST',
                action: 'GOOGLE_LOGIN_FAILED',
                entity: 'AUTH',
                entityId: null,
                metadata: {
                    reason: 'GOOGLE_VERIFY_ERROR',
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                status: AuditLogStatus.FAILED,
                severity: AuditLogSeverity.WARN,
            });

            throw new UnauthorizedException('Xác thực Google thất bại');
        }
    }
}
