import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Disbursement } from "../disbursements/entities/disbursement.entity";
import { AnalyticController } from "./analytic.controller";
import { Donation } from "../donations/entities/donation.entity";
import { LedgerLine } from "../ledger/entities/ledger-line.entity";
import { AnalyticService } from "./analytic.service";

@Module({
    imports: [TypeOrmModule.forFeature([Campaign, Disbursement, Donation, LedgerLine])],
    controllers: [AnalyticController],
    providers: [AnalyticService],
})
export class AnalyticModule { }