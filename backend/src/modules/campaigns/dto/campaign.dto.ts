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
    CLOSED = 'CLOSED',
    SUSPENDED = 'SUSPENDED',
}

export class CreateCampaignDto {
    @IsString()
    @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    category: string;

    @Type(() => Number)
    @IsNumber()
    @Min(1000000, { message: 'Mục tiêu phải lớn hơn 1,000,000 VNĐ' })
    targetAmount: number;

    @IsEnum(CampaignType, { message: 'Loại chiến dịch không hợp lệ' })
    campaignType: CampaignType;

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
    page?: number;

    @IsOptional()
    @Type(() => Number)
    limit?: number;

    @IsOptional()
    @IsString()
    status?: string;

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sort?: 'ASC' | 'DESC';

    @IsOptional()
    @IsString()
    keyword?: string;
}