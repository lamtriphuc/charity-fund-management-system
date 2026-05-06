import { IsNumber, IsOptional, IsString, Min, IsBoolean, IsEnum } from 'class-validator';

export enum PaymentMethod {
    VNPAY = 'VNPAY',
    MOMO = 'MOMO',
    BANK_TRANSFER = 'BANK_TRANSFER',
}

export enum PaymentStatus {
    PENDING,
    SUCCESS,
    FAILED
}

export class CreateDonationDto {
    @IsNumber({}, { message: 'Số tiền phải là một số' })
    @Min(1000, { message: 'Số tiền quyên góp tối thiểu là 1,000 VNĐ' })
    amount: number;

    @IsString()
    @IsOptional()
    message?: string;

    @IsBoolean()
    @IsOptional()
    isAnonymous?: boolean;

    @IsString()
    @IsOptional()
    donorName?: string;
}

// DTO giả lập Webhook của VNPay/Momo gọi về server của bạn
export class WebhookPaymentDto {
    @IsString()
    txReference: string;

    @IsString()
    status: string; // '00' là thành công (theo chuẩn VNPay), hoặc 'SUCCESS'
}