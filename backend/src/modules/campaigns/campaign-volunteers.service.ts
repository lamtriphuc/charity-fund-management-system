import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CampaignVolunteer } from './entities/campaign-volunteer.entity';
import { Campaign } from './entities/campaign.entity';
import { User } from '../users/entities/user.entity';
import { UpdateVolunteerStatusDto, VolunteerStatus } from './dto/campaign-volunteer.dto';

@Injectable()
export class CampaignVolunteersService {
    constructor(
        @InjectRepository(CampaignVolunteer) private volunteerRepo: Repository<CampaignVolunteer>,
        @InjectRepository(Campaign) private campaignRepo: Repository<Campaign>,
        @InjectRepository(User) private userRepo: Repository<User>,
    ) { }

    // 1. TNV XIN GIA NHẬP CHIẾN DỊCH
    async applyToJoin(campaignId: string, userId: string) {
        // Kiểm tra chiến dịch
        const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
        if (!campaign || campaign.status !== 'ACTIVE') {
            throw new BadRequestException('Chiến dịch không tồn tại hoặc đã đóng.');
        }

        // Kiểm tra KYC của User
        const user = await this.userRepo.findOne({ where: { id: userId } });
        if (!user) throw new NotFoundException('Tài khoản không tồn tại.');

        if (user.kycStatus !== 'VERIFIED') {
            throw new ForbiddenException('Bạn phải hoàn tất xác minh danh tính (KYC) mới được tham gia.');
        }

        // Kiểm tra xem đã đăng ký trước đó chưa
        const existingApplication = await this.volunteerRepo.findOne({
            where: { campaign: { id: campaignId }, volunteer: { id: userId } }
        });
        if (existingApplication) {
            throw new ConflictException('Bạn đã gửi yêu cầu tham gia chiến dịch này rồi.');
        }

        // Tạo đơn đăng ký
        const application = this.volunteerRepo.create({
            campaign: campaign,
            volunteer: user,
            status: VolunteerStatus.PENDING,
        });

        await this.volunteerRepo.save(application);
        return { message: 'Đã gửi yêu cầu tham gia, vui lòng chờ Admin phê duyệt.' };
    }

    // 2. ADMIN DUYỆT / TỪ CHỐI TNV
    async updateStatus(campaignId: string, volunteerUserId: string, dto: UpdateVolunteerStatusDto) {
        const application = await this.volunteerRepo.findOne({
            where: { campaign: { id: campaignId }, volunteer: { id: volunteerUserId } }
        });

        if (!application) {
            throw new NotFoundException('Không tìm thấy đơn đăng ký của người dùng này trong chiến dịch.');
        }

        application.status = dto.status;
        await this.volunteerRepo.save(application);

        return { message: `Đã cập nhật trạng thái TNV thành: ${dto.status}` };
    }

    // 3. ADMIN XEM DANH SÁCH TNV CỦA 1 CHIẾN DỊCH
    async getVolunteersByCampaign(campaignId: string) {
        return await this.volunteerRepo.find({
            where: { campaign: { id: campaignId } },
            relations: ['volunteer'], // Lấy luôn thông tin user (email, tên)
            select: {
                id: true,
                status: true,
                volunteer: { id: true, email: true, fullName: true, kycStatus: true } // Chỉ lấy các cột cần thiết
            }
        });
    }
}