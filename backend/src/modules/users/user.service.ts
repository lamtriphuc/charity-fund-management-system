import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { Role } from "./entities/role.entity";
import { ApproveKycDto, SubmitKycDto } from "./dto/user.dto";

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>
    ) { }

    async submitKyc(userId: string, dto: SubmitKycDto) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        // Cập nhật thông tin ngân hàng (hoặc link ảnh CCCD nếu có thêm cột)
        if (dto.bankAccountInfo) {
            user.bankAccountInfo = dto.bankAccountInfo;
        }

        // Giữ nguyên trạng thái PENDING để chờ Admin duyệt
        user.kycStatus = 'PENDING'; // Dùng Enum KycStatus.PENDING nếu bạn đã import

        await this.userRepository.save(user);
        return { message: 'Đã gửi hồ sơ xác minh thành công. Vui lòng chờ Admin phê duyệt.' };
    }

    async approveKycAndUpgrade(userId: string, dto: ApproveKycDto) {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['role']
        });

        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        // Cập nhật trạng thái KYC
        user.kycStatus = dto.kycStatus;

        // Nếu Admin quyết định đổi Role (ví dụ duyệt cho lên VOLUNTEER)
        if (dto.roleName) {
            const newRole = await this.roleRepository.findOne({ where: { name: dto.roleName } });
            if (!newRole) {
                throw new BadRequestException(`Role ${dto.roleName} không tồn tại trong hệ thống`);
            }
            user.role = newRole; // Thay đổi khóa ngoại role_id
        }

        await this.userRepository.save(user);

        return {
            message: 'Cập nhật trạng thái KYC và Role thành công',
            user: {
                email: user.email,
                kycStatus: user.kycStatus,
                role: dto.roleName || user.role.name
            }
        };
    }

    async getProfile(userId: string) {
        return await this.userRepository.findOne({
            where: { id: userId },
            select: ['id', 'email', 'fullName', 'kycStatus', 'bankAccountInfo'],
            relations: ['role']
        });
    }
}