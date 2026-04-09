import { IsNumber, IsString, Min, IsEnum, IsOptional } from 'class-validator';

export enum SupportRequestStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
}

export class CreateSupportRequestDto {
    @IsNumber({}, { message: 'Số tiền phải là số' })
    @Min(100000, { message: 'Số tiền tạm ứng tối thiểu là 100,000 VNĐ' })
    requestedAmount: number;

    @IsString()
    description: string;
}

export class UpdateSupportRequestStatusDto {
    @IsEnum(SupportRequestStatus)
    status: SupportRequestStatus;

    @IsString()
    @IsOptional()
    rejectionReason?: string; // Bắt buộc nếu status là REJECTED
}