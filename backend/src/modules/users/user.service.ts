import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { User } from "./entities/user.entity";
import { Role } from "./entities/role.entity";
import { ApproveKycDto, UpdateUserDto, UserKycStatus } from "./dto/user.dto";
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
            status: KycProfileStatus.PENDING,
        });
        await this.kycProfileRepository.save(newKycProfile);

        user.kycStatus = UserKycStatus.PENDING;
        await this.userRepository.save(user);

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

    async approveKyc(kycProfileId: string, dto: ApproveKycDto) {
        const kycProfile = await this.kycProfileRepository.findOne({
            where: { id: kycProfileId },
            relations: ['user', 'user.role']
        });

        if (!kycProfile) throw new NotFoundException('Không tìm thấy hồ sơ KYC này');

        // Cập nhật trạng thái hồ sơ
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

    async updateProfile(userId: string, dto: UpdateUserDto) {
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new NotFoundException('Không tìm thấy người dùng');
        }

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

        await this.userRepository.save(user);

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
}