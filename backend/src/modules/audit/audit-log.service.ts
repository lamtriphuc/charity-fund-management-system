import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogSeverity, AuditLogStatus, CreateAuditLogDto } from './dto/create-audit-log.dto';
import { SearchService } from '../search/search.service';
import { AuditLog } from './audit-log.entity';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,

    private readonly searchService: SearchService,
  ) {}

  async log(dto: CreateAuditLogDto) {
    const saved = await this.auditLogRepository.save({
      actorId: dto.actorId,
      actorEmail: dto.actorEmail ?? null,
      actorRole: dto.actorRole,
      action: dto.action,
      entity: dto.entity,
      entityId: dto.entityId ?? null,
      before: dto.before ?? null,
      after: dto.after ?? null,
      metadata: dto.metadata ?? null,
      ipAddress: dto.ipAddress ?? null,
      userAgent: dto.userAgent ?? null,
      status: dto.status ?? AuditLogStatus.SUCCESS,
      severity: dto.severity ?? AuditLogSeverity.INFO,
    });

    try {
      await this.searchService.logAction({
        id: saved.id,
        actor_id: saved.actorId,
        actor_email: saved.actorEmail,
        actor_role: saved.actorRole,
        action: saved.action,
        entity: saved.entity,
        entity_id: saved.entityId,
        before: saved.before,
        after: saved.after,
        metadata: saved.metadata,
        ip_address: saved.ipAddress,
        user_agent: saved.userAgent,
        status: saved.status,
        severity: saved.severity,
        timestamp: saved.createdAt,
      });
    } catch (error) {
      this.logger.error('Không thể đồng bộ audit log sang Elasticsearch', error);
    }

    return saved;
  }
}