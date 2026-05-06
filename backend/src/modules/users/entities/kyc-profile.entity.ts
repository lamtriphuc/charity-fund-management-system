import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn, Relation } from 'typeorm';

import { User } from './user.entity';

export enum KycProfileStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED'
}

@Entity('kyc_profiles')
export class KycProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'front_image_url', type: 'varchar', nullable: true })
    frontImageUrl: string | null;

    @Column({ name: 'back_image_url', type: 'varchar', nullable: true })
    backImageUrl: string | null;

    @Column({ name: 'portrait_image_url', type: 'varchar', nullable: true })
    portraitImageUrl: string | null;

    // Dữ liệu trích xuất từ FPT.AI
    @Column({ name: 'extracted_name', type: 'varchar', nullable: true })
    extractedName: string | null;

    @Column({ name: 'extracted_id_number', type: 'varchar', nullable: true })
    extractedIdNumber: string | null;

    @Column({ name: 'extracted_dob', type: 'varchar', nullable: true })
    extractedDob: string | null;

    @Column({ name: 'extracted_gender', type: 'varchar', nullable: true })
    extractedGender: string | null;

    @Column({ name: 'extracted_address', type: 'varchar', nullable: true })
    extractedAddress: string | null;

    @Column({ name: 'bank_account_info', type: 'jsonb', nullable: true })
    bankAccountInfo: Record<string, any> | null;

    @Column({ type: 'enum', enum: KycProfileStatus, default: KycProfileStatus.PENDING })
    status: KycProfileStatus;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string | null; // Lý do từ chối lần up cccd này

    @CreateDateColumn({ name: 'submitted_at', type: 'timestamp' })
    submittedAt: Date;

    @Column({ name: 'reviewed_at', type: 'timestamp', nullable: true })
    reviewedAt: Date | null;
}