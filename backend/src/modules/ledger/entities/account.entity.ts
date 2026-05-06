import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
import { AccountType } from '../dto/ledger.dto';

@Entity('accounts')
export class Account {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 'SYS_CASH', 'CAMP_123', ...
    @Column({ type: 'varchar', unique: true })
    code: string; // VD: 'CASH_BANK_VCB', 'CAMP_123_REVENUE', 'CAMP_123_EXPENSE'

    @Column({ name: 'account_type', type: 'enum', enum: AccountType })
    accountType: string; // ASSET, LIABILITY, REVENUE, EXPENSE

    @Column({ type: 'varchar' })
    name: string;

    // QUAN TRỌNG: Balance có thể tính toán on-the-fly từ LedgerLine, 
    // nhưng lưu snapshot ở đây để query cho nhanh. Bắt buộc cập nhật qua DB Trigger hoặc DB Transaction.
    @Column({ type: 'bigint', default: 0 })
    balance: number;
}