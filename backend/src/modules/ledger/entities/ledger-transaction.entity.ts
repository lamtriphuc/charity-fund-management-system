import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BeforeUpdate, BeforeRemove } from 'typeorm';

@Entity('ledger_transactions')
export class LedgerTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'reference_type', type: 'varchar' })
    referenceType: string; // DONATION, DISBURSEMENT

    @Column({ name: 'reference_id', type: 'uuid' })
    referenceId: string;

    @Column({ name: 'previous_hash', type: 'varchar', nullable: true })
    previousHash: string;

    @Column({ name: 'current_hash', type: 'varchar' })
    currentHash: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @BeforeUpdate()
    preventUpdate() {
        throw new Error('Dữ liệu Sổ cái không thể bị chỉnh sửa từ tầng Application.');
    }

    @BeforeRemove()
    preventRemove() {
        throw new Error('Dữ liệu Sổ cái không thể bị xóa từ tầng Application.');
    }
}