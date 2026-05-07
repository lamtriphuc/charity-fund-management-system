import { Type } from "class-transformer";
import { IsDate, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";

export enum CampaignType {
    FLEXIBLE = 'FLEXIBLE',
    FIXED = 'FIXED',
}

export enum CampaignStatus {
    PENDING = 'PENDING',
    REJECTED = 'REJECTED',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CLOSED = 'CLOSED', // = chưa hoàn thành => refund tiền
    SUSPENDED = 'SUSPENDED',
}

export class CreateCampaignDto {
    @IsString()
    @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(1000000, { message: 'Mục tiêu phải lớn hơn 1,000,000 VNĐ' })
    targetAmount: number;

    @IsEnum(CampaignType, { message: 'Loại chiến dịch không hợp lệ' })
    campaignType: CampaignType;

    @IsOptional()
    @IsString()
    imageUrl?: string;

    @Type(() => Date)
    @IsDate({ message: 'Ngày bắt đầu không hợp lệ' })
    startDate: Date;

    @Type(() => Date)
    @IsDate({ message: 'Ngày kết thúc không hợp lệ' })
    endDate: Date;
}

export class UpdateCampaignStatusDto {
    @IsEnum(CampaignStatus, { message: 'Trạng thái không hợp lệ' })
    status: CampaignStatus;
}

// DTO dùng cho Query Params trên URL (Phân trang & Lọc)
export class GetCampaignsQueryDto {
    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsNumber()
    @Min(1)
    limit?: number = 10;

    @IsOptional()
    @IsEnum(CampaignStatus)
    status?: CampaignStatus;

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sort?: 'ASC' | 'DESC' = 'DESC';
}