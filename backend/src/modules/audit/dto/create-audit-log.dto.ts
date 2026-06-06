export enum AuditLogStatus {
    SUCCESS = 'SUCCESS',
    FAILED = 'FAILED',
}

export enum AuditLogSeverity {
    INFO = 'INFO',
    WARN = 'WARN',
    CRITICAL = 'CRITICAL',
}

export class CreateAuditLogDto {
    actorId: string;
    actorEmail?: string | null;
    actorRole: string;

    action: string;

    entity: string;
    entityId?: string | null;

    before?: Record<string, any> | null;
    after?: Record<string, any> | null;
    metadata?: Record<string, any> | null;

    ipAddress?: string | null;
    userAgent?: string | null;

    status?: AuditLogStatus;
    severity?: AuditLogSeverity;
}