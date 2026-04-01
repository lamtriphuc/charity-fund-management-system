import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('reconciliation_logs')
export class ReconciliationLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'check_time', type: 'timestamp' })
    checkTime: Date;

    @Column({ type: 'varchar' })
    status: string; // MATCHED, DISCREPANCY

    @Column({ type: 'jsonb', nullable: true })
    details: Record<string, any>;
}