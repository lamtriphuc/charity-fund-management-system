import { IsDateString, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export enum RoleName {
    SUPER_ADMIN = 'SUPER_ADMIN',
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

export enum Permission {
    // QUYỀN TỐI THƯỢNG
    ALL = '*', // Dành riêng cho Super Admin

    // QUẢN TRỊ HỆ THỐNG & NGƯỜI DÙNG
    MANAGE_USERS = 'MANAGE_USERS',               // Khóa user, cấp quyền
    VERIFY_KYC = 'VERIFY_KYC',                   // Duyệt hồ sơ KYC lên Tình nguyện viên

    // QUẢN TRỊ CHIẾN DỊCH & TÀI CHÍNH (ADMIN)
    APPROVE_CAMPAIGN = 'APPROVE_CAMPAIGN',       // Duyệt chiến dịch mới
    APPROVE_DISBURSEMENT = 'APPROVE_DISBURSEMENT',// Duyệt xuất tiền
    FORCE_CLOSE_CAMPAIGN = 'FORCE_CLOSE_CAMPAIGN',// Ép đóng/hủy chiến dịch và kết chuyển quỹ

    // KIỂM TOÁN (AUDITOR)
    VIEW_AUDIT_LOGS = 'VIEW_AUDIT_LOGS',         // Xem nhật ký Elasticsearch
    VIEW_FINANCIAL_REPORTS = 'VIEW_FINANCIAL_REPORTS', // Xem sổ cái, đối soát

    // TÌNH NGUYỆN VIÊN (VOLUNTEER)
    CREATE_CAMPAIGN = 'CREATE_CAMPAIGN',         // Tạo chiến dịch
    UPDATE_CAMPAIGN = 'UPDATE_CAMPAIGN',         // Cập nhật thông tin khi chưa duyệt
    REQUEST_DISBURSEMENT = 'REQUEST_DISBURSEMENT',// Xin rút tiền & Up hóa đơn minh chứng
    VIEW_OWN_CAMPAIGN = 'VIEW_OWN_CAMPAIGN',

    // NHÀ HẢO TÂM (DONOR)
    CREATE_DONATION = 'CREATE_DONATION',         // Tạo lệnh nạp tiền định danh
    VIEW_DONATION_HISTORY = 'VIEW_DONATION_HISTORY' // Xem lịch sử quyên góp của chính mình
}

export enum UserAccountStatus {
    ACTIVE = 'ACTIVE',
    BLOCKED = 'BLOCKED'
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