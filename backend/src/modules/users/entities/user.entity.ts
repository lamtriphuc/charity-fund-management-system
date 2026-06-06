import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, type Relation, UpdateDateColumn } from "typeorm";
import { Role } from "./role.entity";
import { UserAccountStatus, UserKycStatus } from "../dto/user.dto";
import { Campaign } from "src/modules/campaigns/entities/campaign.entity";
import { Disbursement } from "src/modules/disbursements/entities/disbursement.entity";
import { KycProfile } from "./kyc-profile.entity";


@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @Column({ type: 'varchar', unique: true })
    email: string;

    @Column({ name: 'hashed_password', type: 'varchar', nullable: true })
    hashedPassword: string;

    @Column({ name: 'full_name', type: 'varchar' })
    fullName: string;

    @Column({ name: 'phone', type: 'varchar', nullable: true })
    phone: string | null;

    @Column({ name: 'dob', type: 'date', nullable: true })
    dob: Date | null;

    @Column({ name: 'gender', type: 'varchar', nullable: true })
    gender: string | null;

    @Column({ name: 'address', type: 'varchar', nullable: true })
    address: string | null;

    @Column({ name: 'bio', type: 'text', nullable: true })
    bio: string | null;

    @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
    avatarUrl: string;

    @Column({ name: 'kyc_status', type: 'enum', enum: UserKycStatus, default: UserKycStatus.NONE })
    kycStatus: UserKycStatus;

    @Column({ name: 'bank_name', type: 'varchar', nullable: true })
    bankName: string;

    @Column({ name: 'bank_account_number', type: 'varchar', nullable: true })
    bankAccountNumber: string;

    @Column({ name: 'bank_account_name', type: 'varchar', nullable: true })
    bankAccountName: string;

    @Column({ name: 'refresh_token', type: 'varchar', nullable: true })
    refreshToken: string | null;

    // 1 User tạo ra nhiều Chiến dịch
    @OneToMany(() => Campaign, campaign => campaign.createdBy)
    campaigns: Relation<Campaign>[];

    // 1 Admin duyệt nhiều Chiến dịch
    @OneToMany(() => Campaign, campaign => campaign.approvedBy)
    approvedCampaigns: Relation<Campaign>[];

    @OneToMany(() => Disbursement, disbursement => disbursement.approvedBy)
    approvedDisbursements: Relation<Disbursement>[];

    // 1 User (TNV) có nhiều Phiếu rút tiền
    @OneToMany(() => Disbursement, disbursement => disbursement.volunteer)
    disbursements: Relation<Disbursement>[];

    @Column({ type: 'enum', enum: UserAccountStatus, default: UserAccountStatus.ACTIVE })
    status: UserAccountStatus;

    @OneToMany(() => KycProfile, kycProfile => kycProfile.user)
    kycProfiles: Relation<KycProfile>[];

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
    updatedAt: Date;
}