import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('support_requests')
export class SupportRequest {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'requester_id' })
    requester: User;

    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @Column({ name: 'requested_amount', type: 'decimal', precision: 15, scale: 2 })
    requestedAmount: number;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'varchar', default: 'Pending' })
    status: string; // Pending, Approved, Rejected
}