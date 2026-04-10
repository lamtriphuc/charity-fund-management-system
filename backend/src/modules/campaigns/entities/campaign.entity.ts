import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity('campaigns')
export class Campaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'target_amount', type: 'bigint' })
    targetAmount: number;

    @Column({ type: 'varchar' })
    campaignType: string; // FLEXIBLE, FIXED

    @Column({ type: 'varchar', default: 'ACTIVE' })
    status: string; // Active, Closed, Suspended

    @Column({ name: 'current_amount', type: 'bigint', default: 0 })
    currentAmount: number;

    @Column({ name: 'start_date', type: 'timestamp' })
    startDate: Date;

    @Column({ name: 'end_date', type: 'timestamp' })
    endDate: Date;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}