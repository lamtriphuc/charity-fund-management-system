import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('accounts')
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'account_type', type: 'varchar' })
    accountType: string; // ASSET, LIABILITY, REVENUE, EXPENSE

    @Column({ type: 'varchar' })
    name: string;

    @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
    balance: number;
}