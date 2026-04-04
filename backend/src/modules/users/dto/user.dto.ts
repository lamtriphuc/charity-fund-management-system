import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { KycStatus } from '../../../common/enums/kyc-status.enum'; // File enum bạn đã tạo ở bài trước

export class SubmitKycDto {
    @IsObject({ message: 'Thông tin ngân hàng phải là một Object' })
    @IsOptional()
    bankAccountInfo?: Record<string, any>; // VD: { bankName: "MBBank", accountNumber: "123", accountName: "Nguyen Van A" }
}

export class ApproveKycDto {
    @IsEnum(KycStatus, { message: 'Trạng thái KYC không hợp lệ' })
    kycStatus: KycStatus;

    @IsString()
    @IsOptional()
    roleName?: string; // Truyền 'VOLUNTEER' nếu duyệt đạt, 'DONOR' nếu từ chối hạ cấp lại
}