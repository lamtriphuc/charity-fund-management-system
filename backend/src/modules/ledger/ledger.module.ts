import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Account } from './entities/account.entity';
import { LedgerLine } from './entities/ledger-line.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Account, LedgerLine, LedgerTransaction])],
    providers: [],
    controllers: [],
    exports: [TypeOrmModule]
})
export class LedgerModule { }
