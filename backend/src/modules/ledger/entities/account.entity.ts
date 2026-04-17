import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('accounts')
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 'SYS_CASH', 'CAMP_123', ...
    @Column({ type: 'varchar', unique: true })
    code: string;

    @Column({ name: 'account_type', type: 'varchar' })
    accountType: string; // ASSET, LIABILITY, REVENUE, EXPENSE

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'bigint', default: 0 })
    balance: number;
}