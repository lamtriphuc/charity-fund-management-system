import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CampaignVolunteersService } from './campaign-volunteers.service';
import { UpdateVolunteerStatusDto } from './dto/campaign-volunteer.dto';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('campaigns/:campaignId/volunteers')
export class CampaignVolunteersController {
    constructor(private readonly volunteersService: CampaignVolunteersService) { }

    // VOLUNTEER XIN GIA NHẬP
    @Post('join')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('VOLUNTEER')
    applyToJoin(
        @Param('campaignId') campaignId: string,
        @CurrentUser() user: any
    ) {
        return this.volunteersService.applyToJoin(campaignId, user.id);
    }

    // ADMIN DUYỆT TNV
    @Patch(':volunteerUserId/status')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    updateStatus(
        @Param('campaignId') campaignId: string,
        @Param('volunteerUserId') volunteerUserId: string,
        @Body() dto: UpdateVolunteerStatusDto
    ) {
        return this.volunteersService.updateStatus(campaignId, volunteerUserId, dto);
    }

    // ADMIN XEM DANH SÁCH TNV
    @Get()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    getVolunteers(@Param('campaignId') campaignId: string) {
        return this.volunteersService.getVolunteersByCampaign(campaignId);
    }
}