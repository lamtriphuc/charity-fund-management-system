import { Body, Controller, Get, Param, Patch, Post, Query, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { DisbursementService } from './disbursement.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ApproveDisbursementDto, AuditProofDto, CreateDisbursementDto, ResolveFlagDto, TransferDisbursementDto } from './dto/disbursement.dto';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Permission } from '../users/dto/user.dto';
import type { Request } from 'express';

@Controller('disbursements')
export class DisbursementController {
    constructor(private readonly disbursementService: DisbursementService) { }

    // VOLUNTEER - tạo yc giải ngân
    @Post('campaign/:campaignId/request')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('VOLUNTEER')
    async createRequest(
        @Param('campaignId') campaignId: string,
        @CurrentUser() user: any,
        @Body() dto: CreateDisbursementDto,
        @Req() req: Request,
    ) {
        return this.disbursementService.createDisbursementRequest(
            campaignId,
            user,
            dto,
            {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'] || null,
            }
        );

    }

    // VOLUNTEER upload
    @Post(':id/proofs')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('VOLUNTEER')
    @UseInterceptors(FilesInterceptor('receipts', 10))
    uploadProof(
        @Param('id') id: string,
        @CurrentUser() user: any,
        @UploadedFiles() files: Express.Multer.File[],
        @Req() req: Request,
    ) {
        return this.disbursementService.uploadProofs(id, user, files, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    // VOLUNTEER - lấy ds chien dich dang ql
    @Get('/campaign/:id')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('VOLUNTEER')
    getDisburmentByCampaigns(
        @Param('id') id: string,
    ) {
        return this.disbursementService.getDisbursementsByCampaign(id);
    }


    // ADMIN - chấp nhận or từ chối
    @Patch(':id/approve')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async approveOrReject(
        @Param('id') id: string,
        @Body() dto: ApproveDisbursementDto,
        @CurrentUser() user: any,
        @Req() req: Request,
    ) {
        return this.disbursementService.approveOrRejectRequest(
            id,
            dto.isApproved,
            dto.reason,
            user,
            {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'] || null,
            }
        );
    }

    @Patch(':id/transfer')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    confirmTransfer(
        @Param('id') id: string,
        @Body() dto: TransferDisbursementDto,
        @CurrentUser() user: any,
        @Req() req: Request,
    ) {
        return this.disbursementService.confirmTransfer(id, dto, user, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    @Get()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN', 'AUDITOR')
    async getAllForAdmin(@Query() query: any) {
        return this.disbursementService.findAllForAdmin(query);
    }

    // AUDITOR
    @Patch('proofs/:proofId/audit')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('AUDITOR', 'ADMIN') // Cho phép cả Admin và Auditor làm việc này
    auditProof(
        @Param('proofId') proofId: string,
        @Body() dto: AuditProofDto,
        @CurrentUser() user: any,
        @Req() req: Request,
    ) {
        return this.disbursementService.auditProof(proofId, dto, user, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    @Post('proofs/:id/verify-signature')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('AUDITOR', 'SUPER_ADMIN')
    async verifyProofSignature(
        @Param('id') proofId: string,
        @CurrentUser() user: any,
        @Req() req: Request,
    ) {
        return await this.disbursementService.verifyProofSignature(proofId, user, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    // Supper Admin duyệt cờ
    @Post(':id/resolve-flag')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    async resolveFlaggedProof(
        @Param('id') proofId: string,
        @Body() dto: ResolveFlagDto,
        @CurrentUser() user: any,
        @Req() req: Request,
    ) {
        return this.disbursementService.resolveFlaggedProof(proofId, user, dto, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    // Public
    @Get('campaign/:campaignId/public-transparency')
    async getPublicTransparency(@Param('campaignId') campaignId: string) {
        return this.disbursementService.getPublicTransparency(campaignId);
    }
}
