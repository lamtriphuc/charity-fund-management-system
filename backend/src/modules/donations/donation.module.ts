import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Disbursement } from '../disbursements/entities/disbursement.entity';
import { DisbursementProof } from '../disbursements/entities/disbursement-proof.entity';
import { Donation } from './entities/donation.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { User } from '../users/entities/user.entity';
import { DonationController } from './donation.controller';
import { DonationService } from './donation.service';
import { LedgerModule } from '../ledger/ledger.module';
import { SystemModule } from '../system/system.module';
import { AuditLogModule } from '../audit/audit-log.module';

@Module({
    imports: [
        LedgerModule,
        SystemModule,
        AuditLogModule,
        TypeOrmModule.forFeature([
            Disbursement, DisbursementProof, Donation, Campaign, User
        ])],
    providers: [DonationService],
    controllers: [DonationController],
    exports: [TypeOrmModule]
})
export class DonationModule { }
