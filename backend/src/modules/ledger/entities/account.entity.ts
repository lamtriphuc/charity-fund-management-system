import { Entity, PrimaryGeneratedColumn, Column, OneToMany, type Relation } from 'typeorm';
import { AccountType } from '../dto/ledger.dto';
import { LedgerLine } from './ledger-line.entity';

export const ColumnNumericTransformer = {
    to: (data: number): number => data,
    from: (data: string): number => parseFloat(data),
};

@Entity('accounts')
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', unique: true })
    code: string;

    @Column({ name: 'account_type', type: 'enum', enum: AccountType })
    accountType: AccountType;

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'bigint', default: 0, transformer: ColumnNumericTransformer })
    balance: number;

    @OneToMany(() => LedgerLine, line => line.account)
    ledgerLines: Relation<LedgerLine>[];
}