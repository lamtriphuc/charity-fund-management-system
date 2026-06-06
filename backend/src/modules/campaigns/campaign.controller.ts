import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, Req, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto, GetCampaignsQueryDto, UpdateCampaignStatusDto } from './dto/campaign.dto';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { SearchService } from '../search/search.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';

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
        @Query('status') status?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number
    ) {
        return this.searchService.searchCampaigns(
            keyword,
            category,
            status,
            page || 1,
            limit || 9
        );
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('VOLUNTEER')
    async getMyCampaigns(@CurrentUser() user: any) {
        return this.campaignService.getMyCampaigns(user.id);
    }


    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.campaignService.findOne(id);
    }

    // PROTECTED API - Volunteer

    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('VOLUNTEER')
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'coverImage', maxCount: 1 },
            { name: 'proofFiles', maxCount: 5 },
        ])
    )
    create(
        @CurrentUser() user: any,
        @Body() createCampaignDto: CreateCampaignDto,
        @UploadedFiles() files: {
            coverImage?: Express.Multer.File[],
            proofFiles?: Express.Multer.File[]
        },
        @Req() req: Request,
    ) {
        return this.campaignService.create(user, createCampaignDto, files, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }


    // PROTECTED API - ADMIN
    @Patch(':id/approve')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    approveCampaign(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Req() req: Request,
    ) {
        return this.campaignService.approveCampaign(id, user, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    @Patch(':id/reject')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    rejectCampaign(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body('reason') reason: string,
        @Req() req: Request,
    ) {
        if (!reason) throw new BadRequestException('Vui lòng cung cấp lý do từ chối');

        return this.campaignService.rejectCampaign(id, reason, user, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    updateStatus(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body() updateCampaignStatusDto: UpdateCampaignStatusDto,
        @Req() req: Request,
    ) {
        return this.campaignService.updateStatus(id, updateCampaignStatusDto, user, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    // System
    @Patch(':id/cancel-reallocate')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async cancelAndReallocate(
        @CurrentUser() user: any,
        @Param('id') id: string,
        @Body('reason') reason: string,
        @Req() req: Request,
    ) {
        if (!reason) throw new BadRequestException('Phải nhập lý do điều chuyển quỹ');

        return this.campaignService.cancelAndReallocate(id, reason, user, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }
}
