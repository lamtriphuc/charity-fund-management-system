import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity('campaigns')
export class Campaign {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ name: 'target_amount', type: 'decimal', precision: 15, scale: 2 })
    targetAmount: number;

    @Column({ type: 'varchar' })
    campaignType: string; // FLEXIBLE, FIXED

    @Column({ type: 'varchar', default: 'Active' })
    status: string; // Active, Closed, Suspended

    @Column({ name: 'start_date', type: 'timestamp' })
    startDate: Date;

    @Column({ name: 'end_date', type: 'timestamp' })
    endDate: Date
}