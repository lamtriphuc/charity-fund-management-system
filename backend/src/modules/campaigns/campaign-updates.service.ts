import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { CampaignUpdate } from './entities/campaign-update.entity';
import { Campaign } from './entities/campaign.entity';
import { CampaignVolunteer } from './entities/campaign-volunteer.entity';
import { CreateCampaignUpdateDto } from './dto/campaign-update.dto';

@Injectable()
export class CampaignUpdatesService {
    constructor(
        @InjectRepository(CampaignUpdate) private updateRepo: Repository<CampaignUpdate>,
        @InjectRepository(Campaign) private campaignRepo: Repository<Campaign>,
        @InjectRepository(CampaignVolunteer) private volunteerRepo: Repository<CampaignVolunteer>,
    ) { }

    async createUpdate(campaignId: string, userId: string, userRole: string, dto: CreateCampaignUpdateDto) {
        const campaign = await this.campaignRepo.findOne({ where: { id: campaignId } });
        if (!campaign) throw new NotFoundException('Không tìm thấy chiến dịch.');

        // Kỉểm tra quyền: Nếu không phải Admin, phải là TNV đang ACTIVE của chiến dịch này mới được đăng bài
        if (userRole !== 'ADMIN') {
            const isParticipant = await this.volunteerRepo.findOne({
                where: { campaign: { id: campaignId }, volunteer: { id: userId }, status: 'ACTIVE' }
            });
            if (!isParticipant) {
                throw new ForbiddenException('Chỉ Admin hoặc TNV đang hoạt động mới được đăng bài cập nhật.');
            }
        }

        const newUpdate = this.updateRepo.create({
            ...dto,
            campaign: campaign,
        });

        return await this.updateRepo.save(newUpdate);
    }

    async getUpdates(campaignId: string) {
        return await this.updateRepo.find({
            where: { campaign: { id: campaignId } },
            order: { createdAt: 'DESC' }
        });
    }
}