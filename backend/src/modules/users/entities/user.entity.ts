import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Role } from "./role.entity";

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Role)
    @JoinColumn({ name: 'role_id' })
    role: Role;

    @Column({ type: 'varchar', unique: true })
    email: string;

    @Column({ name: 'hashed_password', type: 'varchar' })
    hashedPassword: string;

    @Column({ name: 'full_name', type: 'varchar' })
    fullName: string;

    @Column({ name: 'kyc_status', type: 'varchar', default: 'Pending' })
    kycStatus: string; // Pending, Verified, Rejected

    @Column({ name: 'bank_account_info', type: 'jsonb', nullable: true })
    bankAccountInfo: Record<string, any>; // { bankName, accountNumber, accountName }

    @Column({ name: 'refresh_token', type: 'varchar', nullable: true })
    refreshToken: string | null;
}