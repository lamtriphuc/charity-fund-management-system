import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { CampaignController } from './campaign.controller';
import { CampaignService } from './campaign.service';
import { User } from '../users/entities/user.entity';
import { Account } from '../ledger/entities/account.entity';
import { SearchModule } from '../search/search.module';
import { CloudinaryModule } from 'src/common/cloudinary/cloudinary.module';
import { LedgerService } from '../ledger/ledger.service';
import { LedgerLine } from '../ledger/entities/ledger-line.entity';
import { SystemModule } from '../system/system.module';
import { AuditLogModule } from '../audit/audit-log.module';

@Module({
    imports: [
        SearchModule,
        CloudinaryModule,
        SystemModule,
        AuditLogModule,
        TypeOrmModule.forFeature([Campaign, User, Account, LedgerLine])
    ],
    controllers: [
        CampaignController,
    ],
    providers: [
        LedgerService,
        CampaignService,
    ],
    exports: [CampaignService, TypeOrmModule]
})
export class CampaignsModule { }
