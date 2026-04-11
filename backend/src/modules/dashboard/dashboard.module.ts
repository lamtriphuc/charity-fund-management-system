import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

import { Donation } from '../donations/entities/donation.entity';
import { Disbursement } from '../disbursements/entities/disbursement.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { KycProfile } from '../users/entities/kyc-profile.entity';
import { DisbursementProof } from '../disbursements/entities/disbursement-proof.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Donation,
            Disbursement,
            Campaign,
            KycProfile,
            DisbursementProof
        ])
    ],
    controllers: [DashboardController],
    providers: [DashboardService],
})
export class DashboardModule { }