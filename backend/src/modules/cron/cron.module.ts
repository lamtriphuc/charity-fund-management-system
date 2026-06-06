import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Account } from "../ledger/entities/account.entity";
import { ReconciliationService } from "./reconciliation.service";
import { Donation } from "../donations/entities/donation.entity";
import { Disbursement } from "../disbursements/entities/disbursement.entity";
import { LedgerTransaction } from "../ledger/entities/ledger-transaction.entity";
import { LedgerLine } from "../ledger/entities/ledger-line.entity";
import { LogArchiverService } from "./log-archiver.service";
import { SearchModule } from "../search/search.module";
import { CloudinaryModule } from "src/common/cloudinary/cloudinary.module";
import { ArchivedLog } from "../system/entities/archived-log.entity";
import { SystemModule } from "../system/system.module";
import { AuditLogModule } from "../audit/audit-log.module";

@Module({
    imports: [
        SearchModule,
        CloudinaryModule,
        SystemModule,
        AuditLogModule,
        TypeOrmModule.forFeature([Campaign, Account, Donation, Disbursement, LedgerTransaction, LedgerLine, ArchivedLog])
    ],
    providers: [ReconciliationService, LogArchiverService],
})

export class CronModule { }