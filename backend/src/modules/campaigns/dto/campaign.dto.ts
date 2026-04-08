import { Type } from "class-transformer";
import { IsDate, IsEnum, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { CampaignStatus, CampaignType } from "src/modules/campaigns/dto/campaign.enum";

export class CreateCampaignDto {
    @IsString()
    @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @Min(10000, { message: 'Mục tiêu phải lớn hơn 10,000 VNĐ' })
    targetAmount: number;

    @IsEnum(CampaignType, { message: 'Loại chiến dịch không hợp lệ' })
    campaignType: string;

    @Type(() => Date)
    @IsDate({ message: 'Ngày bắt đầu không hợp lệ' })
    startDate: Date;

    @Type(() => Date)
    @IsDate({ message: 'Ngày kết thúc không hợp lệ' })
    endDate: Date;
}

export class UpdateCampaignStatusDto {
    @IsEnum(CampaignStatus, { message: 'Trạng thái không hợp lệ' })
    status: string;
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
    status?: string;

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    sort?: 'ASC' | 'DESC' = 'DESC';
}