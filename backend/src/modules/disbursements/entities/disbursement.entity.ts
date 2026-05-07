import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { User } from '../../users/entities/user.entity';
import { DisbursementStatus } from '../dto/disbursement.dto';

@Entity('disbursements')
export class Disbursement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'volunteer_id' })
    volunteer: User;

    @Column({ type: 'bigint' })
    amount: number;

    @Column({ type: 'text' })
    purpose: string; // Lý do xin giải ngân

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string;

    @Column({ name: 'tx_reference', type: 'varchar', nullable: true })
    txReference: string;

    @Column({ type: 'enum', enum: DisbursementStatus, default: DisbursementStatus.PENDING_APPROVAL })
    status: DisbursementStatus;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}