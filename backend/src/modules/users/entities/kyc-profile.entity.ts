import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('kyc_profiles')
export class KycProfile {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // Một user có thể nộp KYC nhiều lần (nếu bị từ chối)
    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ name: 'front_image_url', type: 'varchar' })
    frontImageUrl: string | null; // Link Cloudinary mặt trước

    @Column({ name: 'back_image_url', type: 'varchar' })
    backImageUrl: string | null; // Link Cloudinary mặt sau

    @Column({ name: 'bank_account_info', type: 'jsonb', nullable: true })
    bankAccountInfo: Record<string, any> | null;

    @Column({ type: 'varchar', default: 'PENDING' })
    status: string; // PENDING, APPROVED, REJECTED

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string; // Lý do từ chối lần up cccd này

    @CreateDateColumn({ name: 'submitted_at', type: 'timestamp' })
    submittedAt: Date;

    @UpdateDateColumn({ name: 'reviewed_at', type: 'timestamp', nullable: true })
    reviewedAt: Date;
}