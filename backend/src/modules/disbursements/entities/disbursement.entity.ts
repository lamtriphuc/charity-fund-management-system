import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, OneToMany, type Relation } from 'typeorm';
import { Campaign } from '../../campaigns/entities/campaign.entity';
import { User } from '../../users/entities/user.entity';
import { DisbursementStatus } from '../dto/disbursement.dto';
import { DisbursementProof } from './disbursement-proof.entity';

@Entity('disbursements')
export class Disbursement {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Campaign, campaign => campaign.disbursements)
    @JoinColumn({ name: 'campaign_id' })
    campaign: Relation<Campaign>;

    @ManyToOne(() => User, user => user.disbursements)
    @JoinColumn({ name: 'volunteer_id' })
    volunteer: Relation<User>;

    @Column({ type: 'varchar' })
    title: string;

    @Column({ type: 'bigint' })
    amount: number;

    @Column({ type: 'text' })
    purpose: string; // Lý do xin giải ngân

    @Column({ name: 'bank_name', type: 'varchar', nullable: true })
    bankName: string;

    @Column({ name: 'bank_account_number', type: 'varchar', nullable: true })
    bankAccountNumber: string;

    @Column({ name: 'bank_account_name', type: 'varchar', nullable: true })
    bankAccountName: string;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string;

    @Column({ name: 'tx_reference', type: 'varchar', nullable: true })
    txReference: string;

    @Column({ type: 'enum', enum: DisbursementStatus, default: DisbursementStatus.PENDING_APPROVAL })
    status: DisbursementStatus;

    @ManyToOne(() => User, user => user.approvedDisbursements, { nullable: true })
    @JoinColumn({ name: 'approved_by' })
    approvedBy: Relation<User> | null;

    @OneToMany(() => DisbursementProof, proof => proof.disbursement, { cascade: true })
    proofs: Relation<DisbursementProof>[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}