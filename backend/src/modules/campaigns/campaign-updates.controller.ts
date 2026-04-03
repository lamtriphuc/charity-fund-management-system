import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CampaignUpdatesService } from './campaign-updates.service';
import { CreateCampaignUpdateDto } from './dto/campaign-update.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('campaigns/:campaignId/updates')
export class CampaignUpdatesController {
    constructor(private readonly updatesService: CampaignUpdatesService) { }

    // ADMIN HOẶC VOLUNTEER ĐĂNG BÀI
    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'VOLUNTEER')
    createUpdate(
        @Param('campaignId') campaignId: string,
        @Body() dto: CreateCampaignUpdateDto,
        @CurrentUser() user: any
    ) {
        return this.updatesService.createUpdate(campaignId, user.id, user.role, dto);
    }

    // PUBLIC XEM NHẬT KÝ CHIẾN DỊCH (Không cần Guard)
    @Get()
    getUpdates(@Param('campaignId') campaignId: string) {
        return this.updatesService.getUpdates(campaignId);
    }
}