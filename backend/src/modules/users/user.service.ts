import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { Role } from "./entities/role.entity";
import { ApproveKycDto, SubmitKycDto } from "./dto/user.dto";
import { KycProfile } from "./entities/kyc-profile.entity";
import { KycProfileStatus } from "src/common/enums/kyc-profile-status.enum";
import { KycStatus } from "src/common/enums/kyc-status.enum";
import { CloudinaryFolder, CloudinaryService } from "src/common/cloudinary/cloudinary.service";
import { ConfigService } from "@nestjs/config";
import FormData from "form-data";

import axios from 'axios';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        @InjectRepository(KycProfile) private readonly kycProfileRepository: Repository<KycProfile>,
        private readonly cloudinaryService: CloudinaryService,
        private configService: ConfigService
    ) { }

    private async scanIDCard(file: Express.Multer.File) {
        try {
            console.log('key: ', this.configService.getOrThrow<string>('FPT_AI_KEY'))
            const formData = new FormData();
            formData.append('image', file.buffer, file.originalname);
            console.log(formData)

            const response = await axios.post('https://api.fpt.ai/vision/idr/vnm', formData, {
                headers: {
                    'api-key': this.configService.getOrThrow<string>('FPT_AI_KEY'),
                    ...formData.getHeaders(), // Trình bày ranh giới multipart
                },
            });

            console.log('res>> ', response)

            const result = response.data;

            if (result.errorCode !== 0) {
                console.error('LỖI TỪ FPT:', result.errorMessage);
                throw new BadRequestException(`FPT từ chối ảnh: ${result.errorMessage}`);
            }

            console.log(' Đọc CCCD thành công!');
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
        userId: string,
        dto: SubmitKycDto,
        frontFile?: Express.Multer.File,
        backFile?: Express.Multer.File,
        portraitFile?: Express.Multer.File
    ) {
        if (!frontFile || !backFile || !portraitFile) {
            throw new BadRequestException('Vui lòng cung cấp đủ ảnh mặt trước, mặt sau và ảnh chân dung!');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Không tìm thấy người dùng');

        const extractedData = await this.scanIDCard(frontFile);

        // Tải ảnh lên Cloudinary song song (nếu có file)
        const [frontUrl, backUrl, portraitUrl] = await Promise.all([
            this.cloudinaryService.uploadFile(frontFile, CloudinaryFolder.KYC_DOCUMENTS).then(r => r.secure_url),
            this.cloudinaryService.uploadFile(backFile, CloudinaryFolder.KYC_DOCUMENTS).then(r => r.secure_url),
            this.cloudinaryService.uploadFile(portraitFile, CloudinaryFolder.KYC_DOCUMENTS).then(r => r.secure_url),
        ]);

        console.log(extractedData)

        const newKycProfile = this.kycProfileRepository.create({
            user: user,
            frontImageUrl: frontUrl,
            backImageUrl: backUrl,
            portraitImageUrl: portraitUrl, // Cần thêm trường này vào Entity
            // Lưu lại những gì FPT quét được (Ví dụ: Họ tên, Số CCCD, Ngày sinh)
            extractedName: extractedData.name,
            extractedIdNumber: extractedData.id,
            extractedDob: extractedData.dob,
            extractedGender: extractedData.sex,
            extractedAddress: extractedData.home,
            status: 'PENDING',
        });
        await this.kycProfileRepository.save(newKycProfile);

        user.kycStatus = KycStatus.PENDING;
        await this.userRepository.save(user);

        return {
            message: 'Đã gửi hồ sơ xác minh thành công.',
            extractedInfo: {
                name: extractedData.name,
                idNumber: extractedData.id,
                dob: extractedData.dob
            }
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
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['role']
        });

        if (!user) {
            throw new NotFoundException('Không tìm thấy người dùng!');
        }

        return {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            kycStatus: user.kycStatus,
            avatar: user.avatarUrl,          // Đổi từ avatarUrl -> avatar
            role: user.role?.name || 'USER'  // Bóc tách lấy mỗi cái Tên của Role
        };
    }

    async updateAvatar(userId: string, file: Express.Multer.File) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('User không tồn tại');

        if (user.avatarUrl) {
            // Ảnh Google có đuôi googleusercontent.com, Cloudinary không thể xóa nó
            if (!user.avatarUrl.includes('googleusercontent.com')) {
                const publicId = this.cloudinaryService.extractPublicIdFromUrl(user.avatarUrl);
                if (publicId) {
                    await this.cloudinaryService.deleteFile(publicId).catch(e => console.log('Lỗi xóa ảnh cũ:', e));
                }
            }
        }

        const uploadResult = await this.cloudinaryService.uploadFile(file, CloudinaryFolder.AVATARS);

        user.avatarUrl = uploadResult.secure_url;
        await this.userRepository.save(user);

        return { avatarUrl: user.avatarUrl };
    }
}