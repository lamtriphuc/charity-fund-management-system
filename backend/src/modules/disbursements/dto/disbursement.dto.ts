import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

// DTO cho Admin xác nhận đã chuyển tiền
export class TransferDisbursementDto {
    @IsString()
    @IsNotEmpty({ message: 'Vui lòng nhập mã giao dịch ngân hàng để đối soát' })
    txReference: string;
}

export enum ProofStatus {
    PENDING_AUDIT = 'PENDING_AUDIT',
    VERIFIED = 'VERIFIED',
    FLAGGED = 'FLAGGED',
}

// DTO cho Kiểm toán viên đánh giá hóa đơn
export class AuditProofDto {
    @IsEnum(ProofStatus)
    verificationStatus: ProofStatus;

    @IsString()
    @IsOptional()
    flaggedReason?: string; // Bắt buộc nhập nếu status là FLAGGED
}