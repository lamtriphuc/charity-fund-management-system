import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, GetCampaignsQueryDto, UpdateCampaignStatusDto } from './dto/campaign.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { SearchService } from '../search/search.service';

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

    // @Get('search')
    // async search(
    //     @Query('keyword') keyword?: string,
    //     @Query('category') category?: string
    // ) {
    //     const data = await this.searchService.searchCampaigns(keyword, category);
    //     return { data };
    // }

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

    // PROTECTED API - ADMIN

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    create(
        @Body() createCampaignDto: CreateCampaignDto
    ) {
        return this.campaignService.create(createCampaignDto);
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
