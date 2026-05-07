import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { CampaignStatus } from "../dto/campaign.dto";
import { User } from "src/modules/users/entities/user.entity";

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

    @Column({ type: 'enum', enum: CampaignStatus, default: CampaignStatus.PENDING })
    status: CampaignStatus;

    @Column({ name: 'current_amount', type: 'bigint', default: 0 })
    currentAmount: number;

    @Column({ name: 'fund_account_id', type: 'uuid', nullable: true })
    fundAccountId: string;

    @Column({ type: 'varchar', nullable: true })
    category: string;

    @Column({ name: 'image_url', type: 'text', nullable: true })
    imageUrl: string;

    @Column({ name: 'start_date', type: 'timestamp' })
    startDate: Date;

    @Column({ name: 'end_date', type: 'timestamp' })
    endDate: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'created_by' }) // Volunteer khởi xướng
    createdBy: User;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'approved_by' }) // Admin duyệt
    approvedBy: User;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}