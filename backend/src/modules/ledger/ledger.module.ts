import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { LedgerLine } from './entities/ledger-line.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';
import { LedgerService } from './ledger.service';

@Module({
    imports: [TypeOrmModule.forFeature([Account, LedgerLine, LedgerTransaction])],
    providers: [LedgerService],
    controllers: [],
    exports: [TypeOrmModule, LedgerService]
})
export class LedgerModule { }
