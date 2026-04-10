import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Disbursement } from '../disbursements/entities/disbursement.entity';
import { DisbursementProof } from '../disbursements/entities/disbursement-proof.entity';
import { Donation } from './entities/donation.entity';
import { SupportRequest } from '../support-requests/support-request.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { User } from '../users/entities/user.entity';
import { DonationController } from './donations.controller';
import { DonationService } from './donation.service';

@Module({
    imports: [TypeOrmModule.forFeature([Disbursement, DisbursementProof, Donation, SupportRequest, Campaign, User])],
    providers: [DonationService],
    controllers: [DonationController],
    exports: [TypeOrmModule]
})
export class TransactionsModule { }
