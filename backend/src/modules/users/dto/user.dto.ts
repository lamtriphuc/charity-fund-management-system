import { IsDateString, IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';
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
    roleName?: string;
}

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MaxLength(100)
    fullName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @IsOptional()
    @IsDateString({}, { message: 'Ngày sinh phải đúng định dạng (YYYY-MM-DD)' })
    dob?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    gender?: string;

    @IsOptional()
    @IsString()
    @MaxLength(255)
    address?: string;

    @IsOptional()
    @IsString()
    bio?: string;

    // banking
    @IsOptional()
    @IsString()
    bankName?: string;

    @IsOptional()
    @IsString()
    bankAccountNumber?: string;

    @IsOptional()
    @IsString()
    bankAccountName?: string;
}