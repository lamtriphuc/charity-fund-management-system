import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

// DTO cho Admin xác nhận đã chuyển tiền
export class TransferDisbursementDto {
    @IsString()
    @IsNotEmpty({ message: 'Vui lòng nhập mã giao dịch ngân hàng để đối soát' })
    txReference: string;
}

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
}

// DTO cho Kiểm toán viên đánh giá hóa đơn
export class AuditProofDto {
    @IsEnum(ProofStatus)
    verificationStatus: ProofStatus;

    @IsString()
    @IsOptional()
    flaggedReason?: string; // Bắt buộc nhập nếu status là FLAGGED
}