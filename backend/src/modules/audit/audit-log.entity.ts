import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditLogSeverity, AuditLogStatus } from './dto/create-audit-log.dto';


@Entity('audit_logs')
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Index()
    @Column({ name: 'actor_id', type: 'varchar' })
    actorId: string;

    @Column({ name: 'actor_email', type: 'varchar', nullable: true })
    actorEmail: string | null;

    @Column({ name: 'actor_role', type: 'varchar' })
    actorRole: string;

    @Index()
    @Column({ type: 'varchar' })
    action: string;

    @Index()
    @Column({ type: 'varchar' })
    entity: string;

    @Index()
    @Column({ name: 'entity_id', type: 'varchar', nullable: true })
    entityId: string | null;

    @Column({ type: 'jsonb', nullable: true })
    before: Record<string, any> | null;

    @Column({ type: 'jsonb', nullable: true })
    after: Record<string, any> | null;

    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any> | null;

    @Column({ name: 'ip_address', type: 'varchar', nullable: true })
    ipAddress: string | null;

    @Column({ name: 'user_agent', type: 'text', nullable: true })
    userAgent: string | null;

    @Column({
        type: 'enum',
        enum: AuditLogStatus,
        default: AuditLogStatus.SUCCESS,
    })
    status: AuditLogStatus;

    @Column({
        type: 'enum',
        enum: AuditLogSeverity,
        default: AuditLogSeverity.INFO,
    })
    severity: AuditLogSeverity;

    @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
    createdAt: Date;
}