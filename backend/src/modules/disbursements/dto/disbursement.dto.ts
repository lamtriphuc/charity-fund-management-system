import { IsString, IsNotEmpty, IsEnum, IsOptional, IsNumber, Min, IsBoolean } from 'class-validator';

export enum DisbursementStatus {
    PENDING_APPROVAL = 'PENDING_APPROVAL', // Mới tạo => chờ chấp nhận
    REJECTED = 'REJECTED',                 // Từ chối
    PENDING_TRANSFER = 'PENDING_TRANSFER', // Đã chấp nhận => chờ chuyển tiền
    TRANSFERRED = 'TRANSFERRED'            // Kế toán đã chuyển tiền thành công
}

export enum ProofStatus {
    PENDING_AUDIT = 'PENDING_AUDIT', // Chờ Ban kiểm soát duyệt
    VERIFIED = 'VERIFIED',           // Hợp lệ
    FLAGGED = 'FLAGGED',             // Bị đánh dấu gian lận/sai sót
    REJECTED = 'REJECTED'
}


export class CreateDisbursementDto {
    @IsString()
    @IsNotEmpty({ message: 'Vui lòng nhập tiêu đề cho đợt giải ngân' })
    title: string;

    @IsNumber()
    @Min(100000, { message: 'Rút tối thiểu 100.000đ' })
    amount: number;

    @IsString()
    @IsNotEmpty({ message: 'Vui lòng nhập lý do giải ngân' })
    purpose: string
}


export class ApproveDisbursementDto {
    @IsBoolean()
    isApproved: boolean;

    @IsString()
    @IsOptional()
    reason?: string;
}


// DTO cho Admin xác nhận đã chuyển tiền
export class TransferDisbursementDto {
    @IsString()
    @IsNotEmpty({ message: 'Vui lòng nhập mã giao dịch ngân hàng để đối soát' })
    txReference: string;
}

// DTO cho Kiểm toán viên đánh giá hóa đơn
export class AuditProofDto {
    @IsEnum(ProofStatus)
    verificationStatus: ProofStatus;

    @IsString()
    @IsOptional()
    flaggedReason?: string;
}

// Super ADMIN
export enum FlagResolutionAction {
    OVERRIDE_ACCEPT = 'OVERRIDE_ACCEPT', // Xóa cờ, chấp nhận hóa đơn hợp lệ
    CONFIRM_FRAUD = 'CONFIRM_FRAUD'      // Xác nhận gian lận, từ chối hóa đơn
}

export class ResolveFlagDto {
    @IsEnum(FlagResolutionAction)
    action: FlagResolutionAction;

    @IsString()
    @IsNotEmpty()
    resolutionNote: string;
}