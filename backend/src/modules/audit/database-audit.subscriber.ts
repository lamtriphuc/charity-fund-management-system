import {
    EventSubscriber,
    EntitySubscriberInterface,
    UpdateEvent,
    InsertEvent,
    RemoveEvent,
    DataSource,
} from 'typeorm';
import { Injectable, Logger } from '@nestjs/common';
import { SearchService } from '../search/search.service';
import { error } from 'console';

const ignoredTables = [
    'audit_logs',
    'archived_logs',
    'ledger_transactions',
    'ledger_lines',
];
const ignoredFields = [
    'createdAt',
    'updatedAt',
    'created_at',
    'updated_at',
    'hashedPassword',
    'hashed_password',
    'refreshToken',
    'refresh_token',
];

const sensitiveFields = [
    'hashedPassword',
    'hashed_password',
    'refreshToken',
    'refresh_token',
    'password',
    'accessToken',
    'access_token',
    'bankAccountNumber',
    'bank_account_number',
    'extractedIdNumber',
    'extracted_id_number',
    'frontImageUrl',
    'front_image_url',
    'backImageUrl',
    'back_image_url',
    'portraitImageUrl',
    'portrait_image_url',
];

@Injectable()
@EventSubscriber()
export class DatabaseAuditSubscriber implements EntitySubscriberInterface {
    private readonly logger = new Logger(DatabaseAuditSubscriber.name);

    constructor(
        private dataSource: DataSource,
        private searchService: SearchService
    ) {
        this.dataSource.subscribers.push(this);
    }



    async afterUpdate(event: UpdateEvent<any>) {
        if (!event.entity || !event.databaseEntity) return;

        const tableName = event.metadata.tableName;

        if (ignoredTables.includes(tableName)) return;

        const oldData = event.databaseEntity;
        const newData = event.entity;

        const changes: Record<string, any> = {};

        for (const key of Object.keys(newData)) {
            if (ignoredFields.includes(key)) continue;

            const oldValue = this.normalizeValue(oldData[key]);
            const newValue = this.normalizeValue(newData[key]);

            if (oldValue !== newValue) {
                changes[key] = {
                    old: this.maskSensitiveValue(key, oldValue),
                    new: this.maskSensitiveValue(key, newValue),
                };
            }
        }

        if (Object.keys(changes).length === 0) return;

        const auditLog = {
            timestamp: new Date().toISOString(),
            actor_id: 'SYSTEM',
            actor_email: null,
            actor_role: 'DATABASE_AUDITOR',
            action: 'DATABASE_ENTITY_UPDATED',
            entity: tableName.toUpperCase(),
            entity_id: oldData.id ?? newData.id ?? null,
            ip_address: null,
            payload: {
                changes,
            },
            status: 'SUCCESS',
            severity: 'WARN',
        };

        this.searchService.logAction(auditLog).catch(e => this.logger.error(e));
    }

    async afterRemove(event: RemoveEvent<any>) {
        if (!event.databaseEntity) return;

        const tableName = event.metadata.tableName;

        if (ignoredTables.includes(tableName)) return;

        const deletedData = this.maskObject(event.databaseEntity);

        const auditLog = {
            timestamp: new Date().toISOString(),
            actor_id: 'SYSTEM',
            actor_email: null,
            actor_role: 'DATABASE_AUDITOR',
            action: 'DATABASE_ENTITY_DELETED',
            entity: tableName.toUpperCase(),
            entity_id: event.databaseEntity.id ?? null,
            ip_address: null,
            payload: {
                deleted_data: deletedData,
            },
            status: 'SUCCESS',
            severity: 'CRITICAL',
        };

        this.searchService.logAction(auditLog).catch(e => this.logger.error(e));
    }

    private normalizeValue(value: any): any {
        if (value === null || value === undefined) {
            return value;
        }

        if (value instanceof Date) {
            return value.toISOString();
        }

        /**
         * Nếu là relation object, ví dụ:
         * user: { id: '...', email: '...' }
         * thì chỉ lấy id để tránh log nguyên object.
         */
        if (typeof value === 'object') {
            if ('id' in value) {
                return value.id;
            }

            try {
                return JSON.stringify(value);
            } catch {
                return '[UNSERIALIZABLE_OBJECT]';
            }
        }

        return value;
    }

    private maskSensitiveValue(key: string, value: any): any {
        if (value === null || value === undefined) {
            return value;
        }

        if (sensitiveFields.includes(key)) {
            return '[MASKED]';
        }

        return value;
    }

    private maskObject(data: Record<string, any>) {
        const result: Record<string, any> = {};

        for (const key of Object.keys(data)) {
            if (ignoredFields.includes(key)) continue;

            const value = this.normalizeValue(data[key]);
            result[key] = this.maskSensitiveValue(key, value);
        }

        return result;
    }
}