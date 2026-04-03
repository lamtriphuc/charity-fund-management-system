import { IsEnum, IsNotEmpty, IsString, IsArray, IsOptional } from 'class-validator';

export enum VolunteerStatus {
    PENDING = 'PENDING',     // Chờ duyệt
    ACTIVE = 'ACTIVE',       // Đang làm nhiệm vụ
    COMPLETED = 'COMPLETE',  // Đã hoàn thành
    BANNED = 'BANNED',       // Bị cấm
}

export class UpdateVolunteerStatusDto {
    @IsEnum(VolunteerStatus, { message: 'Trạng thái tình nguyện viên không hợp lệ' })
    status: string;
}