import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, type Relation } from 'typeorm';
import { ProofStatus } from '../dto/disbursement.dto';
import { Disbursement } from './disbursement.entity';
import { User } from 'src/modules/users/entities/user.entity';

@Entity('disbursement_proofs')
export class DisbursementProof {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Disbursement, disbursement => disbursement.proofs, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'disbursement_id' })
    disbursement: Relation<Disbursement>;

    @Column({ name: 'file_url', type: 'varchar' })
    fileUrl: string;

    @Column({ name: 'hmac_signature', type: 'varchar', nullable: true })
    hmacSignature: string;

    @Column({ name: 'flagged_reason', type: 'text', nullable: true })
    flaggedReason?: string | null;

    @Column({ name: 'verification_status', type: 'enum', enum: ProofStatus, default: ProofStatus.PENDING_AUDIT })
    verificationStatus: ProofStatus;

    @ManyToOne(() => User, { nullable: true })
    @JoinColumn({ name: 'resolved_by' })
    resolvedBy?: Relation<User> | null;
    
    @Column({ name: 'resolution_note', type: 'text', nullable: true })
    resolutionNote?: string | null; // Ghi chú quyết định (Ví dụ: "Đã thu hồi tiền", "Hóa đơn hợp lệ do mờ, chấp nhận")

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}