import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignUpdate } from './entities/campaign-update.entity';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { User } from '../users/entities/user.entity';
import { CampaignUpdatesController } from './campaign-updates.controller';
import { CampaignUpdatesService } from './campaign-updates.service';
import { Account } from '../ledger/entities/account.entity';
import { SearchModule } from '../search/search.module';

@Module({
    imports: [
        SearchModule,
        TypeOrmModule.forFeature([Campaign, CampaignUpdate, User, Account])
    ],
    controllers: [
        CampaignController,
        CampaignUpdatesController
    ],
    providers: [
        CampaignService,
        CampaignUpdatesService,
    ],
    exports: [CampaignService]
})
export class CampaignsModule { }
