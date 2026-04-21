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
        private readonly campaignsService: CampaignService,
        private readonly searchService: SearchService
    ) { }

    // PUBLIC API
    @Get()
    findAll(@Query() query: GetCampaignsQueryDto) {
        return this.campaignsService.findAll(query);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.campaignsService.findOne(id);
    }

    @Get('search')
    async search(@Query('q') keyword: string) {
        if (!keyword) {
            return []; // Nếu không gõ gì thì trả về rỗng
        }

        // Gọi thẳng vào Elasticsearch, BỎ QUA HOÀN TOÀN POSTGRESQL!
        const results = await this.searchService.searchCampaigns(keyword);

        return {
            message: 'Tìm kiếm siêu tốc với Elasticsearch',
            total: results.length,
            data: results
        };
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
