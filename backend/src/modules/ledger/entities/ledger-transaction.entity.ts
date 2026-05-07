import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BeforeUpdate, BeforeRemove } from 'typeorm';
import { LedgerReferenceType } from '../dto/ledger.dto';

@Entity('ledger_transactions')
export class LedgerTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'reference_type', type: 'enum', enum: LedgerReferenceType })
    referenceType: LedgerReferenceType; // DONATION, DISBURSEMENT, FUND_TRANSFER

    @Column({ name: 'reference_id', type: 'uuid' })
    referenceId: string;

    @Column({ name: 'previous_hash', type: 'varchar', nullable: true })
    previousHash: string;

    @Column({ name: 'current_hash', type: 'varchar' })
    currentHash: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    // Khóa chống sửa xóa
    @BeforeUpdate() preventUpdate() { throw new Error('Immutable Ledger'); }
    @BeforeRemove() preventRemove() { throw new Error('Immutable Ledger'); }
}