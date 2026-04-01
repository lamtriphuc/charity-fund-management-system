import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { SupportRequest } from './support-request.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { User } from '../../users/entities/user.entity';

@Entity('disbursements')
export class Disbursement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => SupportRequest)
    @JoinColumn({ name: 'support_request_id' })
    supportRequest: SupportRequest;

    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'volunteer_id' })
    volunteer: User;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ type: 'varchar' })
    status: string;
}