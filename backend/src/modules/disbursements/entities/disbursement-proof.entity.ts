import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Disbursement } from './disbursement.entity';
import { ProofStatus } from '../dto/disbursement.dto';

@Entity('disbursement_proofs')
export class DisbursementProof {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Disbursement)
    @JoinColumn({ name: 'disbursement_id' })
    disbursement: Disbursement;

    @Column({ name: 'file_url', type: 'varchar' })
    fileUrl: string;

    @Column({ name: 'digital_signature', type: 'varchar', nullable: true })
    digitalSignature: string;

    @Column({ name: 'flagged_reason', type: 'text', nullable: true })
    flaggedReason?: string | null;

    @Column({ name: 'verification_status', type: 'enum', enum: ProofStatus, default: ProofStatus.PENDING_AUDIT })
    verificationStatus: string; 

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}