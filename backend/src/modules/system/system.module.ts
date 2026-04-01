import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { ReconciliationLog } from './entities/reconciliation-log.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Notification, ReconciliationLog])],
    providers: [],
    controllers: [],
    exports: [TypeOrmModule]
})
export class SystemModule { }
