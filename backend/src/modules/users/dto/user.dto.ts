import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { KycStatus } from '../../../common/enums/kyc-status.enum'; // File enum bạn đã tạo ở bài trước
import { KycProfileStatus } from 'src/common/enums/kyc-profile-status.enum';

export class SubmitKycDto {
    @IsOptional()
    bankAccountInfo?: any; // VD: { bankName: "MBBank", accountNumber: "123", accountName: "Nguyen Van A" }
}

export class ApproveKycDto {
    @IsEnum(KycProfileStatus, { message: 'Trạng thái KYC không hợp lệ' })
    status: KycProfileStatus;

    @IsString()
    @IsOptional()
    rejectionReason?: string;

    @IsString()
    @IsOptional()
    roleName?: string; // Truyền 'VOLUNTEER' nếu duyệt đạt, 'DONOR' nếu từ chối hạ cấp lại
}