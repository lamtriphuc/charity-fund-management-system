import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Donation } from "../donations/entities/donation.entity";
import { Disbursement } from "../disbursements/entities/disbursement.entity";
import { StatementController } from "./statements.controller";
import { StatementService } from "./statements.service";

@Module({
    imports: [TypeOrmModule.forFeature([Campaign, Donation, Disbursement])],
    controllers: [StatementController],
    providers: [StatementService]
})
export class StatementModule { }