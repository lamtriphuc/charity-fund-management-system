import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { Role } from "./entities/role.entity";
import { ApproveKycDto, KycProfileStatus, UpdateUserDto, UserAccountStatus, UserKycStatus } from "./dto/user.dto";
import { KycProfile } from "./entities/kyc-profile.entity";
import { CloudinaryFolder, CloudinaryService } from "src/common/cloudinary/cloudinary.service";
import { ConfigService } from "@nestjs/config";
import FormData from "form-data";

import axios from 'axios';
import { AuditLogService } from "../audit/audit-log.service";
import { AuditLogSeverity, AuditLogStatus } from "../audit/dto/create-audit-log.dto";
import { NotificationService } from "../system/notification.service";
import { NotificationType } from "../system/entities/notification.entity";

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        @InjectRepository(KycProfile) private readonly kycProfileRepository: Repository<KycProfile>,
        private readonly cloudinaryService: CloudinaryService,
        private configService: ConfigService,
        private readonly auditLogService: AuditLogService,
        private readonly notificationService: NotificationService,
    ) { }

    async findAllForAdmin(
        page: number = 1,
        limit: number = 10,
        keyword?: string,
        role?: string
    ) {
        // Ép kiểu về số (đề phòng dữ liệu truyền lên từ Controller là chuỗi)
        const currentPage = Number(page) || 1;
        const currentLimit = Number(limit) || 10;
        const skip = (currentPage - 1) * currentLimit;

        // Khởi tạo QueryBuilder, kết nối (JOIN) với bảng Role để lấy tên quyền hạn
        const qb = this.userRepository.createQueryBuilder('user')
            .leftJoinAndSelect('user.role', 'role')
            .leftJoinAndSelect('user.kycProfiles', 'kycProfiles')
            .select([
                'user.id',
                'user.email',
                'user.fullName',
                'user.status',
                'user.createdAt',
                'user.avatarUrl',
                'user.kycStatus',

                'role.name',

                'kycProfiles.id',
                'kycProfiles.status',
                'kycProfiles.frontImageUrl',
                'kycProfiles.backImageUrl',
                'kycProfiles.portraitImageUrl',
                'kycProfiles.extractedName',
                'kycProfiles.extractedIdNumber',
                'kycProfiles.extractedDob',
                'kycProfiles.rejectionReason',
                'kycProfiles.submittedAt',
            ])
            .orderBy('user.createdAt', 'DESC')
            .addOrderBy('kycProfiles.submittedAt', 'DESC')
            .skip(skip)
            .take(currentLimit);

        // 1. Logic Lọc theo Role
        if (role && role !== '') {
            if (role === 'ADMIN') {
                qb.andWhere(
                    'role.name IN (:...roles)',
                    { roles: ['ADMIN', 'SUPER_ADMIN'] }
                );
            } else {
                qb.andWhere(
                    'role.name = :role',
                    { role }
                );
            }
        }

        // 2. Logic Tìm kiếm theo Tên hoặc Email
        if (keyword) {
            qb.andWhere(
                '(user.fullName ILIKE :keyword OR user.email ILIKE :keyword)',
                { keyword: `%${keyword}%` }
            );
        }

        // Thực thi truy vấn lấy cả dữ liệu lẫn tổng số bản ghi
        const [items, total] = await qb.getManyAndCount();

        // Định dạng lại dữ liệu trả về cho Frontend dễ xử lý
        const mappedItems = items.map(user => {
            const latestKyc = user.kycProfiles?.[0];

            return {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                status: user.status,
                createdAt: user.createdAt,
                avatarUrl: user.avatarUrl,
                role: user.role?.name || 'DONOR',

                kycProfileId: latestKyc?.id || null,
                kycStatus: user.kycStatus || 'NONE',
                idCardNumber: latestKyc?.extractedIdNumber || null,
                dob: latestKyc?.extractedDob || null,
                idCardFront: latestKyc?.frontImageUrl || null,
                idCardBack: latestKyc?.backImageUrl || null,
                portraitImage: latestKyc?.portraitImageUrl || null,
                kycRejectReason: latestKyc?.rejectionReason || null,
            };
        });

        return {
            data: mappedItems,
            meta: {
                totalItems: total,
                itemCount: mappedItems.length,
                itemsPerPage: currentLimit,
                totalPages: Math.ceil(total / currentLimit),
                currentPage: currentPage,
            },
        };
    }

    async updateStatus(
        id: string,
        status: string,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        // 1. Kiểm tra dữ liệu đầu vào thủ công (vì không dùng DTO)
        if (!status) {
            throw new BadRequestException('Vui lòng cung cấp trạng thái (status)');
        }

        if (status !== 'ACTIVE' && status !== 'BLOCKED') {
            throw new BadRequestException('Trạng thái không hợp lệ. Chỉ chấp nhận ACTIVE hoặc BLOCKED');
        }

        // 2. Tìm người dùng
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['role'],
        });
        if (!user) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }
        const before = {
            status: user.status,
        };

        // 3. Cập nhật và lưu
        user.status = status as UserAccountStatus;
        const savedUser = await this.userRepository.save(user);

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'ADMIN',
            action: 'UPDATE_USER_STATUS',
            entity: 'USER',
            entityId: savedUser.id,
            before,
            after: {
                status: savedUser.status,
            },
            metadata: {
                targetEmail: savedUser.email,
                targetFullName: savedUser.fullName,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: status === 'BLOCKED'
                ? AuditLogSeverity.WARN
                : AuditLogSeverity.INFO,
        });

        return {
            message: `Đã ${status === 'ACTIVE' ? 'mở khóa' : 'khóa'} tài khoản thành công!`,
            status: user.status
        };
    }

    // Hàm cập nhật quyền hạn (Role)
    async updateRole(
        id: string,
        roleName: string,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        // 1. Kiểm tra đầu vào thủ công
        if (!roleName) {
            throw new BadRequestException('Vui lòng cung cấp tên quyền hạn (roleName)');
        }

        // 2. Tìm người dùng
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['role'],
        });
        if (!user) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }

        const before = {
            role: user.role?.name ?? null,
        };

        const role = await this.roleRepository.findOne({ where: { name: roleName } });
        if (!role) {
            throw new BadRequestException(`Không tìm thấy quyền hạn: ${roleName} trong hệ thống`);
        }

        // 4. Cập nhật Role và lưu
        user.role = role;
        const savedUser = await this.userRepository.save(user);

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'ADMIN',
            action: 'ASSIGN_USER_ROLE',
            entity: 'USER',
            entityId: savedUser.id,
            before,
            after: {
                role: role.name,
            },
            metadata: {
                targetEmail: savedUser.email,
                targetFullName: savedUser.fullName,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.CRITICAL,
        });

        return {
            message: `Đã cấp quyền ${roleName} cho tài khoản ${user.fullName}`,
            role: role.name
        };
    }

    private async scanIDCard(file: Express.Multer.File) {
        try {
            const formData = new FormData();
            formData.append('image', file.buffer, file.originalname);

            const response = await axios.post('https://api.fpt.ai/vision/idr/vnm', formData, {
                headers: {
                    'api-key': this.configService.getOrThrow<string>('FPT_AI_KEY'),
                    ...formData.getHeaders(), // Trình bày ranh giới multipart
                },
            });

            const result = response.data;

            if (result.errorCode !== 0) {
                console.error('LỖI TỪ FPT:', result.errorMessage);
                throw new BadRequestException(`FPT từ chối ảnh: ${result.errorMessage}`);
            }

            return result.data[0];
        } catch (error) {
            if (error.response) {
                console.error('HTTP LỖI:', error.response.status, error.response.data);
            }
            throw new BadRequestException(
                error.message || 'Không thể trích xuất CCCD. Vui lòng thử lại!'
            );
        }
    }

    async submitKyc(
        currentUser: any,
        frontFile?: Express.Multer.File,
        backFile?: Express.Multer.File,
        portraitFile?: Express.Multer.File,
        requestInfo?: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const userId = currentUser.id;

        if (!frontFile || !backFile || !portraitFile) {
            throw new BadRequestException('Vui lòng cung cấp đủ ảnh mặt trước, mặt sau và ảnh chân dung!');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        if (user.kycStatus === UserKycStatus.VERIFIED) {
            throw new BadRequestException('Tài khoản đã được xác minh KYC.');
        }

        const pendingProfile = await this.kycProfileRepository.findOne({
            where: {
                user: { id: user.id },
                status: KycProfileStatus.PENDING,
            },
        });

        if (pendingProfile) {
            throw new BadRequestException(
                'Bạn đã có hồ sơ KYC đang chờ duyệt. Vui lòng chờ quản trị viên xử lý trước khi gửi lại.',
            );
        }

        const extractedData = await this.scanIDCard(frontFile);

        const extractedIdNumber = extractedData?.id?.trim();

        if (!extractedIdNumber) {
            throw new BadRequestException('Không thể trích xuất số CCCD từ ảnh mặt trước.');
        }

        const duplicatedKyc = await this.kycProfileRepository
            .createQueryBuilder('kyc')
            .leftJoin('kyc.user', 'user')
            .where('kyc.extractedIdNumber = :idNumber', { idNumber: extractedIdNumber })
            .andWhere('kyc.status IN (:...statuses)', {
                statuses: [KycProfileStatus.PENDING, KycProfileStatus.APPROVED],
            })
            .andWhere('user.id != :userId', { userId: user.id })
            .getOne();

        if (duplicatedKyc) {
            throw new BadRequestException(
                'Số CCCD này đã được sử dụng hoặc đang chờ xác minh ở tài khoản khác.',
            );
        }

        // Tải ảnh lên Cloudinary song song (nếu có file)
        const [frontUrl, backUrl, portraitUrl] = await Promise.all([
            this.cloudinaryService.uploadFile(frontFile, CloudinaryFolder.KYC_DOCUMENTS).then(r => r.secure_url),
            this.cloudinaryService.uploadFile(backFile, CloudinaryFolder.KYC_DOCUMENTS).then(r => r.secure_url),
            this.cloudinaryService.uploadFile(portraitFile, CloudinaryFolder.KYC_DOCUMENTS).then(r => r.secure_url),
        ]);

        const newKycProfile = this.kycProfileRepository.create({
            user: user,
            frontImageUrl: frontUrl,
            backImageUrl: backUrl,
            portraitImageUrl: portraitUrl, // Cần thêm trường này vào Entity
            // Lưu lại những gì FPT quét được (Ví dụ: Họ tên, Số CCCD, Ngày sinh)
            extractedName: extractedData.name,
            extractedIdNumber: extractedIdNumber,
            extractedDob: extractedData.dob,
            extractedGender: extractedData.sex,
            extractedAddress: extractedData.home,
            status: KycProfileStatus.PENDING,
        });
        const savedKycProfile = await this.kycProfileRepository.save(newKycProfile);

        const before = {
            kycStatus: user.kycStatus,
        };

        user.kycStatus = UserKycStatus.PENDING;
        await this.userRepository.save(user);

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'DONOR',
            action: 'SUBMIT_KYC',
            entity: 'KYC_PROFILE',
            entityId: savedKycProfile.id,
            before,
            after: {
                kycStatus: user.kycStatus,
                profileStatus: savedKycProfile.status,
                hasFrontImage: !!savedKycProfile.frontImageUrl,
                hasBackImage: !!savedKycProfile.backImageUrl,
                hasPortraitImage: !!savedKycProfile.portraitImageUrl,
                extractedName: savedKycProfile.extractedName,
            },
            metadata: {
                userId: user.id,
                email: user.email,
            },
            ipAddress: requestInfo?.ipAddress ?? null,
            userAgent: requestInfo?.userAgent ?? null,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.WARN,
        });

        return {
            message: 'Đã gửi hồ sơ xác minh thành công.',
            uploadedUrls: {
                frontImageUrl: frontUrl,
                backImageUrl: backUrl,
                portraitImageUrl: portraitUrl
            },
            extractedInfo: {
                name: extractedData.name,
                idNumber: extractedData.id,
                dob: extractedData.dob
            }
        };
    }

    async approveKyc(
        kycProfileId: string,
        dto: ApproveKycDto,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const kycProfile = await this.kycProfileRepository.findOne({
            where: { id: kycProfileId },
            relations: ['user', 'user.role']
        });

        if (!kycProfile) throw new NotFoundException('Không tìm thấy hồ sơ KYC này');

        if (kycProfile.status !== KycProfileStatus.PENDING) {
            throw new BadRequestException('Hồ sơ KYC này đã được xử lý trước đó.');
        }

        const before = {
            profileStatus: kycProfile.status,
            userKycStatus: kycProfile.user.kycStatus,
            userRole: kycProfile.user.role?.name ?? null,
            rejectionReason: kycProfile.rejectionReason,
        };

        if (dto.status === KycProfileStatus.APPROVED) {
            const idNumber = kycProfile.extractedIdNumber?.trim();

            if (!idNumber) {
                throw new BadRequestException('Hồ sơ không có số CCCD hợp lệ để duyệt.');
            }

            const duplicatedApproved = await this.kycProfileRepository
                .createQueryBuilder('kyc')
                .leftJoin('kyc.user', 'user')
                .where('kyc.extractedIdNumber = :idNumber', { idNumber })
                .andWhere('kyc.status = :status', { status: KycProfileStatus.APPROVED })
                .andWhere('user.id != :userId', { userId: kycProfile.user.id })
                .getOne();

            if (duplicatedApproved) {
                throw new BadRequestException(
                    'Số CCCD này đã được xác minh cho một tài khoản khác.',
                );
            }
        }

        kycProfile.status = dto.status as KycProfileStatus;
        kycProfile.reviewedAt = new Date();

        if (dto.status === KycProfileStatus.REJECTED) {
            if (!dto.rejectionReason) throw new BadRequestException('Phải nhập lý do từ chối');
            kycProfile.rejectionReason = dto.rejectionReason;
        } else {
            kycProfile.rejectionReason = null;
        }
        await this.kycProfileRepository.save(kycProfile);

        const user = kycProfile.user;

        user.kycStatus = dto.status === KycProfileStatus.APPROVED
            ? UserKycStatus.VERIFIED
            : UserKycStatus.REJECTED;

        if (dto.status === KycProfileStatus.APPROVED && dto.roleName) {
            const newRole = await this.roleRepository.findOne({ where: { name: dto.roleName } });
            if (!newRole) throw new BadRequestException(`Role ${dto.roleName} không tồn tại`);
            user.role = newRole;
        }

        await this.userRepository.save(user);

        if (dto.status === KycProfileStatus.APPROVED) {
            await this.notificationService.sendNotification(
                user.id,
                user.email,
                'Hồ sơ KYC đã được phê duyệt',
                dto.roleName
                    ? `Hồ sơ định danh của bạn đã được phê duyệt. Tài khoản của bạn đã được cấp vai trò ${dto.roleName}.`
                    : 'Hồ sơ định danh của bạn đã được phê duyệt. Bạn có thể sử dụng các chức năng yêu cầu xác minh danh tính.',
                NotificationType.SUCCESS,
                '/profile',
                true
            );
        }

        if (dto.status === KycProfileStatus.REJECTED) {
            await this.notificationService.sendNotification(
                user.id,
                user.email,
                'Hồ sơ KYC bị từ chối',
                `Hồ sơ định danh của bạn chưa được phê duyệt. Lý do: ${kycProfile.rejectionReason}`,
                NotificationType.WARNING,
                '/profile',
                true
            );
        }

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'ADMIN',
            action: dto.status === KycProfileStatus.APPROVED
                ? 'APPROVE_KYC'
                : 'REJECT_KYC',
            entity: 'KYC_PROFILE',
            entityId: kycProfile.id,
            before,
            after: {
                profileStatus: kycProfile.status,
                userKycStatus: user.kycStatus,
                userRole: user.role?.name ?? null,
                rejectionReason: kycProfile.rejectionReason,
                reviewedAt: kycProfile.reviewedAt,
            },
            metadata: {
                targetUserId: user.id,
                targetEmail: user.email,
                roleGranted: dto.roleName ?? null,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.WARN,
        });

        return { message: `Đã xử lý hồ sơ: ${dto.status}` };
    }

    async findKycProfilesForAdmin(
        status: string = 'PENDING',
        page: number = 1,
        limit: number = 10,
        keyword?: string,
    ) {
        const currentPage = Number(page) || 1;
        const pageSize = Number(limit) || 10;

        const qb = this.kycProfileRepository
            .createQueryBuilder('kyc')
            .leftJoinAndSelect('kyc.user', 'user')
            .leftJoinAndSelect('user.role', 'role')
            .orderBy('kyc.submittedAt', 'DESC')
            .skip((currentPage - 1) * pageSize)
            .take(pageSize);

        if (status && status !== 'ALL') {
            qb.andWhere('kyc.status = :status', { status });
        }

        if (keyword && keyword.trim() !== '') {
            qb.andWhere(
                `(
                user.fullName ILIKE :keyword
                OR user.email ILIKE :keyword
                OR kyc.extractedName ILIKE :keyword
                OR kyc.extractedIdNumber ILIKE :keyword
            )`,
                { keyword: `%${keyword.trim()}%` },
            );
        }

        const [items, total] = await qb.getManyAndCount();

        return {
            data: items.map((kyc) => ({
                id: kyc.id,
                status: kyc.status,
                rejectionReason: kyc.rejectionReason,

                submittedAt: kyc.submittedAt,
                reviewedAt: kyc.reviewedAt,

                frontImageUrl: kyc.frontImageUrl,
                backImageUrl: kyc.backImageUrl,
                portraitImageUrl: kyc.portraitImageUrl,

                extractedName: kyc.extractedName,
                extractedIdNumber: kyc.extractedIdNumber,
                extractedDob: kyc.extractedDob,
                extractedGender: kyc.extractedGender,
                extractedAddress: kyc.extractedAddress,

                user: {
                    id: kyc.user?.id,
                    fullName: kyc.user?.fullName,
                    email: kyc.user?.email,
                    avatarUrl: kyc.user?.avatarUrl,
                    kycStatus: kyc.user?.kycStatus,
                    role: kyc.user?.role,
                },
            })),
            meta: {
                totalItems: total,
                itemCount: items.length,
                itemsPerPage: pageSize,
                currentPage,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }

    async getMyKycHistory(userId: string) {
        return await this.kycProfileRepository.find({
            where: { user: { id: userId } },
            order: { submittedAt: 'DESC' } // Mới nhất lên đầu
        });
    }

    async getProfile(userId: string) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['role'] // Bắt buộc lấy cả bảng kycProfile
        });

        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        const latestKyc = await this.kycProfileRepository.findOne({
            where: { user: { id: userId } },
            order: { submittedAt: 'DESC' } // Tự động lấy cái nộp gần nhất
        });

        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            phone: user.phone,
            dob: user.dob,
            gender: user.gender,
            address: user.address,
            bio: user.bio,
            kycStatus: user.kycStatus,
            avatar: user.avatarUrl,
            role: user.role?.name || 'DONOR',

            // Trả về dữ liệu từ hồ sơ mới nhất (nếu có)
            kycProfile: latestKyc ? {
                extractedName: latestKyc.extractedName,
                extractedIdNumber: latestKyc.extractedIdNumber,
                extractedDob: latestKyc.extractedDob,
                extractedGender: latestKyc.extractedGender,
                extractedAddress: latestKyc.extractedAddress,
                frontImageUrl: latestKyc.frontImageUrl,
                backImageUrl: latestKyc.backImageUrl,
                portraitImageUrl: latestKyc.portraitImageUrl,
                status: latestKyc.status,
                rejectionReason: latestKyc.rejectionReason
            } : null,

            bankName: user.bankName,
            bankAccountNumber: user.bankAccountNumber,
            bankAccountName: user.bankAccountName,
        };
    }

    async updateAvatar(
        userId: string,
        file: Express.Multer.File,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });

        if (!user) {
            throw new NotFoundException('User không tồn tại');
        }

        const oldAvatarUrl = user.avatarUrl;

        if (oldAvatarUrl) {
            if (!oldAvatarUrl.includes('googleusercontent.com')) {
                const publicId = this.cloudinaryService.extractPublicIdFromUrl(oldAvatarUrl);
                if (publicId) {
                    await this.cloudinaryService
                        .deleteFile(publicId)
                        .catch(e => console.log('Lỗi xóa ảnh cũ:', e));
                }
            }
        }

        const uploadResult = await this.cloudinaryService.uploadFile(
            file,
            CloudinaryFolder.AVATARS,
        );

        user.avatarUrl = uploadResult.secure_url;

        const savedUser = await this.userRepository.save(user);

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'DONOR',
            action: 'UPDATE_AVATAR',
            entity: 'USER',
            entityId: savedUser.id,
            before: {
                avatarUrl: oldAvatarUrl ? '[EXISTING_AVATAR]' : null,
            },
            after: {
                avatarUrl: '[UPDATED_AVATAR]',
            },
            metadata: {
                fileMimeType: file.mimetype,
                fileSize: file.size,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.INFO,
        });

        return { avatarUrl: savedUser.avatarUrl };
    }

    async updateProfile(
        userId: string,
        dto: UpdateUserDto,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }

        const before = {
            fullName: user.fullName,
            phone: user.phone,
            dob: user.dob,
            gender: user.gender,
            address: user.address,
            bio: user.bio,
            bankName: user.bankName,
            bankAccountNumber: this.maskBankAccount(user.bankAccountNumber),
            bankAccountName: user.bankAccountName,
        };

        // Cập nhật các trường được phép thay đổi
        if (dto.fullName) user.fullName = dto.fullName;
        if (dto.phone !== undefined) user.phone = dto.phone;
        if (dto.gender !== undefined) user.gender = dto.gender;
        if (dto.address !== undefined) user.address = dto.address;
        if (dto.bio !== undefined) user.bio = dto.bio;

        if (dto.dob !== undefined) {
            // Nếu có chuỗi ngày tháng -> Ép về Date. Nếu truyền null -> Lưu null vào DB
            user.dob = dto.dob ? new Date(dto.dob) : null;
        }

        // banking
        if (dto.bankName !== undefined) user.bankName = dto.bankName;
        if (dto.bankAccountNumber !== undefined) user.bankAccountNumber = dto.bankAccountNumber;
        if (dto.bankAccountName !== undefined) user.bankAccountName = dto.bankAccountName;

        const savedUser = await this.userRepository.save(user);

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'DONOR',
            action: 'UPDATE_PROFILE',
            entity: 'USER',
            entityId: savedUser.id,
            before,
            after: {
                fullName: savedUser.fullName,
                phone: savedUser.phone,
                dob: savedUser.dob,
                gender: savedUser.gender,
                address: savedUser.address,
                bio: savedUser.bio,
                bankName: savedUser.bankName,
                bankAccountNumber: this.maskBankAccount(savedUser.bankAccountNumber),
                bankAccountName: savedUser.bankAccountName,
            },
            metadata: {
                changedBySelf: currentUser.id === savedUser.id,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.INFO,
        });

        return {
            message: 'Cập nhật thông tin thành công',
            user: {
                id: user.id,
                fullName: user.fullName,
                phone: user.phone,
                dob: user.dob,
                gender: user.gender,
                address: user.address,
                bio: user.bio,

                bankName: user.bankName,
                bankAccountNumber: user.bankAccountNumber,
                bankAccountName: user.bankAccountName,
            }
        };
    }

    private maskBankAccount(value?: string | null) {
        if (!value) return null;
        if (value.length <= 4) return '****';
        return '*'.repeat(value.length - 4) + value.slice(-4);
    }
}