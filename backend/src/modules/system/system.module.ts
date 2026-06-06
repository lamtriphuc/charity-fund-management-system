import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { NotificationService } from './notification.service';
import { User } from '../users/entities/user.entity';
import { NotificationController } from './notification.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Notification, User])],
    providers: [NotificationService],
    controllers: [NotificationController],
    exports: [NotificationService]
})
export class SystemModule { }
