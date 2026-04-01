import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Disbursement } from './disbursement.entity';

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

    @Column({ name: 'verification_status', type: 'varchar', default: 'Pending_Audit' })
    verificationStatus: string; // Pending_Audit, Verified, Flagged
}