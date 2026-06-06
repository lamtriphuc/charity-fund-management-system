import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from "typeorm";
import { CampaignStatus, CampaignType } from "../dto/campaign.dto";
import { User } from "src/modules/users/entities/user.entity";
import { Disbursement } from "src/modules/disbursements/entities/disbursement.entity";

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

    @Column({ type: 'enum', enum: CampaignType, nullable: false })
    campaignType: CampaignType; // FLEXIBLE, FIXED

    @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.PENDING })
    status: CampaignStatus;

    @Column({ name: 'current_amount', type: 'bigint', default: 0 })
    currentAmount: number;

    @Column({ type: 'varchar', nullable: true })
    category: string;

    @Column({ name: 'image_urls', type: 'text', nullable: true })
    imageUrls: string;

    @Column({ name: 'start_date', type: 'timestamp' })
    startDate: Date;

    @Column({ name: 'end_date', type: 'timestamp' })
    endDate: Date;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string;

    @ManyToOne(() => User, user => user.campaigns)
    @JoinColumn({ name: 'created_by' })
    createdBy: Relation<User>;

    @ManyToOne(() => User, user => user.approvedCampaigns, { nullable: true })
    @JoinColumn({ name: 'approved_by' })
    approvedBy: Relation<User> | null;

    // 1 Chiến dịch có nhiều đợt giải ngân
    @OneToMany(() => Disbursement, disbursement => disbursement.campaign)
    disbursements: Relation<Disbursement>[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}