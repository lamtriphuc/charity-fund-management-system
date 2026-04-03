import { IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export class CreateCampaignUpdateDto {
    @IsString()
    @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
    title: string;

    @IsString()
    @IsNotEmpty({ message: 'Nội dung không được để trống' })
    content: string;

    @IsArray()
    @IsString({ each: true })
    @IsOptional()
    imageUrls?: string[]; // Mảng chứa các link ảnh thực tế
}