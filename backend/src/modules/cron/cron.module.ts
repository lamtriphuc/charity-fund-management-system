import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Account } from "../ledger/entities/account.entity";
import { ReconciliationService } from "./reconciliation.service";
import { Donation } from "../donations/entities/donation.entity";
import { Disbursement } from "../disbursements/entities/disbursement.entity";
import { LedgerTransaction } from "../ledger/entities/ledger-transaction.entity";
import { LedgerLine } from "../ledger/entities/ledger-line.entity";

@Module({
    imports: [TypeOrmModule.forFeature([Campaign, Account, Donation, Disbursement, LedgerTransaction, LedgerLine])],
    providers: [ReconciliationService],
})

export class CronModule { }