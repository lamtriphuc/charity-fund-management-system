import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Campaign } from '../../campaigns/entities/campaign.entity';

@Entity('donations')
export class Donation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'donor_id' })
    donor: User | null;

    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign

    @Column({ type: 'decimal', precision: 15, scale: 2 })
    amount: number;

    @Column({ type: 'text', nullable: true })
    message: string;

    @Column({ name: 'is_anonymous', type: 'boolean', default: false })
    isAnonymous: boolean;

    @Column({ name: 'donor_name', type: 'varchar', nullable: true })
    donorName: string | null;

    @Column({ name: 'payment_method', type: 'varchar', default: 'BANK_TRANSFER' })
    paymentMethod: string;

    @Column({ name: 'tx_reference', type: 'varchar', unique: true })
    txReference: string;

    @Column({ type: 'varchar', default: 'Pending' })
    status: string; // PENDING, SUCCESS, FAILED

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date
}