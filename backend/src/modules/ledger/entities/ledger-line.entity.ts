import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { LedgerTransaction } from './ledger-transaction.entity';
import { Account } from './account.entity';

@Entity('ledger_lines')
export class LedgerLine {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => LedgerTransaction)
    @JoinColumn({ name: 'ledger_transaction_id' })
    ledgerTransaction: LedgerTransaction;

    @ManyToOne(() => Account)
    @JoinColumn({ name: 'account_id' })
    account: Account;

    @Column({ name: 'is_debit', type: 'boolean' })
    isDebit: boolean;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;
}