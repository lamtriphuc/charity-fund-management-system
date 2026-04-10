import { Module } from '@nestjs/common';
import { SupportRequestController } from './support-requests.controller';
import { SupportRequestService } from './support-requests.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignVolunteer } from '../campaigns/entities/campaign-volunteer.entity';
import { SupportRequest } from './support-request.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Campaign, CampaignVolunteer, SupportRequest])],
    controllers: [SupportRequestController],
    providers: [SupportRequestService],
})
export class SupportRequestModule { }
