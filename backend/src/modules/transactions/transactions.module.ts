import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Disbursement } from './entities/disbursement.entity';
import { DisbursementProof } from './entities/disbursement-proof.entity';
import { Donation } from './entities/donation.entity';
import { SupportRequest } from './entities/support-request.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Disbursement, DisbursementProof, Donation, SupportRequest])],
    providers: [],
    controllers: [],
    exports: [TypeOrmModule]
})
export class TransactionsModule { }
