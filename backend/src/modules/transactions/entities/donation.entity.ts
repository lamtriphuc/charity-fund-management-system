import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('donations')
export class Donation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'donor_id' })
    donor: User;

    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ name: 'payment_method', type: 'varchar' })
    paymentMethod: string;

    @Column({ name: 'tx_reference', type: 'varchar', unique: true })
    txReference: string;

    @Column({ name: 'is_anonymous', type: 'boolean', default: false })
    isAnonymous: boolean;

    @Column({ type: 'varchar', default: 'Pending' })
    status: string; // Pending, Success, Failed
}