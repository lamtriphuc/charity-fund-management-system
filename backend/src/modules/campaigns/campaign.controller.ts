import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, GetCampaignsQueryDto, UpdateCampaignStatusDto } from './dto/campaign.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('campaigns')
export class CampaignController {
    constructor(private readonly campaignsService: CampaignService) { }

    // PUBLIC API
    @Get()
    findAll(@Query() query: GetCampaignsQueryDto) {
        return this.campaignsService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.campaignsService.findOne(id);
    }

    // PROTECTED API - ADMIN

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    create(
        @Body() createCampaignDto: CreateCampaignDto
    ) {
        return this.campaignsService.create(createCampaignDto);
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    updateStatus(
        @Param('id') id: string,
        @Body() updateCampaignStatusDto: UpdateCampaignStatusDto
    ) {
        return this.campaignsService.updateStatus(id, updateCampaignStatusDto);
    }
}
