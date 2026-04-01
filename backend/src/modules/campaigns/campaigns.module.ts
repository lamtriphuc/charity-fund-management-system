import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignUpdate } from './entities/campaign-update.entity';
import { CampaignVolunteer } from './entities/campaign-volunteer.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Campaign, CampaignUpdate, CampaignVolunteer])],
    providers: [],
    controllers: [],
    exports: [TypeOrmModule]
})
export class CampaignsModule { }
