import { ConflictException, ForbiddenException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { RoleName } from 'src/modules/users/dto/role.enum';
import { KycStatus } from 'src/common/enums/kyc-status.enum';
import { Role } from '../users/entities/role.entity';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    private async getTokens(userId: string, email: string, role: string) {
        const payload = { sub: userId, email, role };

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
            kycStatus: KycStatus.PENDING,
            role: defaultRole
        });

        await this.userRepository.save(newUser);
        return { message: 'Đăng ký thành công' }
    }

    async login(dto: LoginDto) {
        const user = await this.userRepository.findOne({
            where: { email: dto.email }, relations: ['role']
        });

        if (!user || !(await bcrypt.compare(dto.password, user.hashedPassword))) {
            throw new UnauthorizedException('Sai email hoặc mật khẩu');
        }

        const roleName = user.role?.name || 'Donors';
        const tokens = await this.getTokens(user.id, user.email, roleName);

        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return { ...tokens, user: { id: user.id, email: user.email, role: roleName } };
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
        const isRtMatches = await bcrypt.compare(refreshToken, user.refreshToken);
        if (!isRtMatches) throw new ForbiddenException('Refresh Token không hợp lệ');

        // Tạo cặp token mới
        const roleName = user.role?.name || 'Donors';
        const tokens = await this.getTokens(user.id, user.email, roleName);
        await this.updateRefreshToken(user.id, tokens.refreshToken);

        return tokens;
    }
}
