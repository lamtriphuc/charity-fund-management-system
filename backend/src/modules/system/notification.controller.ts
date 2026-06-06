import { Controller, Get, Patch, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotificationService } from './notification.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('notifications')
@UseGuards(AuthGuard('jwt'))
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    getMyNotifications(@CurrentUser() user: any) {
        return this.notificationService.getMyNotifications(user.id);
    }

    @Patch('read-all')
    markAllAsRead(@CurrentUser() user: any) {
        return this.notificationService.markAllAsRead(user.id);
    }

    @Patch(':id/read')
    markAsRead(@Param('id') id: string, @CurrentUser() user: any) {
        return this.notificationService.markAsRead(id, user.id);
    }
}