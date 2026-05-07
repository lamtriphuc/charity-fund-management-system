import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, GetCampaignsQueryDto, UpdateCampaignStatusDto } from './dto/campaign.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { SearchService } from '../search/search.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';

@Controller('campaigns')
export class CampaignController {
    constructor(
        private readonly campaignService: CampaignService,
        private readonly searchService: SearchService
    ) { }

    // PUBLIC API
    @Get()
    findAll(@Query() query: GetCampaignsQueryDto) {
        return this.campaignService.findAll(query);
    }


    @Get('urgent')
    async getUrgent() {
        return this.campaignService.getUrgentCampaigns();
    }

    @Get('search')
    async searchES(
        @Query('keyword') keyword?: string,
        @Query('category') category?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        return this.searchService.searchCampaigns(
            keyword,
            category,
            page || 1,
            limit || 9
        );
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.campaignService.findOne(id);
    }

    // PROTECTED API - Volunteer

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('VOLUNTEER')
    create(
        @CurrentUser() user: any,
        @Body() createCampaignDto: CreateCampaignDto
    ) {
        const volunteerId = user.id;
        return this.campaignService.create(volunteerId, createCampaignDto);
    }

    // PROTECTED API - ADMIN

    @Patch(':id/approve')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    approveCampaign(
        @CurrentUser() user: any,
        @Param('id') id: string,
    ) {
        const adminId = user.id;
        return this.campaignService.approveCampaign(id, adminId);
    }

    @Patch(':id/reject')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    rejectCampaign(
        @Param('id') id: string,
        @Body('reason') reason: string
    ) {
        if (!reason) throw new BadRequestException('Vui lòng cung cấp lý do từ chối');
        return this.campaignService.rejectCampaign(id, reason);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    updateStatus(
        @Param('id') id: string,
        @Body() updateCampaignStatusDto: UpdateCampaignStatusDto
    ) {
        return this.campaignService.updateStatus(id, updateCampaignStatusDto);
    }


}
