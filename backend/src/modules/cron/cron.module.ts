import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Account } from "../ledger/entities/account.entity";
import { ReconciliationService } from "./reconciliation.service";

@Module({
    imports: [TypeOrmModule.forFeature([Campaign, Account])],
    providers: [ReconciliationService],
})

export class CronModule { }