import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum RoleName {
    ADMIN = 'ADMIN',
    DONOR = 'DONOR',
    VOLUNTEER = 'VOLUNTEER',
    AUDITOR = 'AUDITOR',
}

export enum UserKycStatus {
    NONE = 'NONE',         // Chưa từng nộp
    PENDING = 'PENDING',   // Đang chờ duyệt
    VERIFIED = 'VERIFIED', // Đã là tình nguyện viên
    REJECTED = 'REJECTED'  // Bị từ chối
}

export enum KycProfileStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
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