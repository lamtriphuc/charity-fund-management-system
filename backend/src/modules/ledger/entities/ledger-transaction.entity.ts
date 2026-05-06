import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, BeforeUpdate, BeforeRemove, OneToMany } from 'typeorm';
import { LedgerLine } from './ledger-line.entity';

@Entity('ledger_transactions')
export class LedgerTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'reference_type', type: 'varchar' })
    referenceType: string; // DONATION, DISBURSEMENT, FUND_TRANSFER

    @Column({ name: 'reference_id', type: 'uuid' })
    referenceId: string;

    @Column({ name: 'previous_hash', type: 'varchar', nullable: true })
    previousHash: string;

    @Column({ name: 'current_hash', type: 'varchar' })
    currentHash: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @OneToMany(() => LedgerLine, line => line.ledgerTransaction, { cascade: true })
    lines: LedgerLine[];

    // Khóa chống sửa xóa
    @BeforeUpdate() preventUpdate() { throw new Error('Immutable Ledger'); }
    @BeforeRemove() preventRemove() { throw new Error('Immutable Ledger'); }
}