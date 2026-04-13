import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignUpdate } from './entities/campaign-update.entity';
import { CampaignVolunteer } from './entities/campaign-volunteer.entity';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { User } from '../users/entities/user.entity';
import { CampaignVolunteersController } from './campaign-volunteers.controller';
import { CampaignUpdatesController } from './campaign-updates.controller';
import { CampaignUpdatesService } from './campaign-updates.service';
import { CampaignVolunteersService } from './campaign-volunteers.service';
import { Account } from '../ledger/entities/account.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Campaign, CampaignUpdate, CampaignVolunteer, User, Account])],
    controllers: [
        CampaignController,
        CampaignVolunteersController,
        CampaignUpdatesController
    ],
    providers: [
        CampaignService,
        CampaignUpdatesService,
        CampaignVolunteersService
    ],
    exports: [CampaignService]
})
export class CampaignsModule { }
