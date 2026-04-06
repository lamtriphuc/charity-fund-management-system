import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { Role } from "./entities/role.entity";
import { ApproveKycDto, SubmitKycDto } from "./dto/user.dto";
import { KycProfile } from "./entities/kyc-profile.entity";
import { KycProfileStatus } from "src/common/enums/kyc-profile-status.enum";
import { KycStatus } from "src/common/enums/kyc-status.enum";

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        @InjectRepository(KycProfile) private readonly kycProfileRepository: Repository<KycProfile>
    ) { }

    async submitKyc(userId: string, dto: SubmitKycDto, frontPath: string, backPath: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        let parsedBankInfo = null;
        if (dto.bankAccountInfo) {
            parsedBankInfo = typeof dto.bankAccountInfo === 'string'
                ? JSON.parse(dto.bankAccountInfo)
                : dto.bankAccountInfo;
        }

        const newKycProifle = this.kycProfileRepository.create({
            user: user,
            frontImageUrl: frontPath,
            backImageUrl: backPath,
            bankAccountInfo: parsedBankInfo ?? undefined,
            status: KycProfileStatus.PENDING
        });
        await this.kycProfileRepository.save(newKycProifle);

        user.kycStatus = KycStatus.PENDING;
        await this.userRepository.save(user);

        return { message: 'Đã gửi hồ sơ xác minh thành công. Vui lòng chờ Admin phê duyệt.' };
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