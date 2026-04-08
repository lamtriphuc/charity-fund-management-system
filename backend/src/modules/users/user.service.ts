import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { Role } from "./entities/role.entity";
import { ApproveKycDto, SubmitKycDto } from "./dto/user.dto";
import { KycProfile } from "./entities/kyc-profile.entity";
import { KycProfileStatus } from "src/common/enums/kyc-profile-status.enum";
import { KycStatus } from "src/common/enums/kyc-status.enum";
import { CloudinaryService } from "src/common/cloudinary/cloudinary.service";

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        @InjectRepository(KycProfile) private readonly kycProfileRepository: Repository<KycProfile>,
        private readonly cloudinaryService: CloudinaryService
    ) { }

    async submitKyc(
        userId: string,
        dto: SubmitKycDto,
        frontFile?: Express.Multer.File,
        backFile?: Express.Multer.File
    ) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        // Tải ảnh lên Cloudinary song song (nếu có file)
        let frontImageUrl = null;
        let backImageUrl = null;

        if (frontFile) {
            const uploadResult = await this.cloudinaryService.uploadFile(frontFile, 'kyc_documents');
            frontImageUrl = uploadResult.secure_url;
        }

        if (backFile) {
            const uploadResult = await this.cloudinaryService.uploadFile(backFile, 'kyc_documents');
            backImageUrl = uploadResult.secure_url;
        }

        let parsedBankInfo = null;
        if (dto.bankAccountInfo) {
            parsedBankInfo = typeof dto.bankAccountInfo === 'string'
                ? JSON.parse(dto.bankAccountInfo)
                : dto.bankAccountInfo;
        }

        const newKycProfile = this.kycProfileRepository.create({
            user: user,
            frontImageUrl: frontImageUrl,
            backImageUrl: backImageUrl,
            bankAccountInfo: parsedBankInfo,
            status: 'PENDING',
        });
        await this.kycProfileRepository.save(newKycProfile);

        user.kycStatus = KycStatus.PENDING;
        await this.userRepository.save(user);

        return {
            message: 'Đã gửi hồ sơ xác minh thành công.',
            kycProfileId: newKycProfile.id,
            uploadedUrls: { frontImageUrl, backImageUrl } // (Tùy chọn) Trả về cho frontend xem trước
        };
    }

    async approveKyc(kycProfileId: string, dto: ApproveKycDto) {
        const kycProfile = await this.kycProfileRepository.findOne({
            where: { id: kycProfileId },
            relations: ['user', 'user.role']
        });

        if (!kycProfile) throw new NotFoundException('Không tìm thấy hồ sơ KYC này');

        // Cập nhật trạng thái hồ sơ
        kycProfile.status = dto.status;
        if (dto.status === 'REJECTED') {
            if (!dto.rejectionReason) throw new BadRequestException('Phải nhập lý do từ chối');
            kycProfile.rejectionReason = dto.rejectionReason;
        }
        await this.kycProfileRepository.save(kycProfile);

        const user = kycProfile.user;
        user.kycStatus = dto.status === KycProfileStatus.APPROVED ? KycStatus.VERIFIED : KycStatus.REJECTED;

        if (dto.status === 'APPROVED' && dto.roleName) {
            const newRole = await this.roleRepository.findOne({ where: { name: dto.roleName } });
            if (!newRole) throw new BadRequestException(`Role ${dto.roleName} không tồn tại`);
            user.role = newRole;
        }

        await this.userRepository.save(user);

        return { message: `Đã xử lý hồ sơ: ${dto.status}` };
    }

    async getMyKycHistory(userId: string) {
        return await this.kycProfileRepository.find({
            where: { user: { id: userId } },
            order: { submittedAt: 'DESC' } // Mới nhất lên đầu
        });
    }

    async getProfile(userId: string) {
        return await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'email', 'fullName', 'kycStatus'],
            relations: ['role']
        });
    }
}