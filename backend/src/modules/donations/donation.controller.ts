import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import { DonationService } from "./donation.service";
import { CreateDonationDto, WebhookPaymentDto } from "./dto/donation.dto";
import type { Request } from 'express';
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { AuthGuard } from "@nestjs/passport";

@Controller()
export class DonationController {
    constructor(private readonly donationService: DonationService) { }

    // tạo quyên góp và lấy mã QR
    @Post('/campaigns/:campaignId/donations')
    async createDonation(
        @Param('campaignId') campaignId: string,
        @Body() dto: CreateDonationDto,
        @Req() req: Request
    ) {
        let userId = null;
        if (req.user) {
            userId = (req.user as any).id;
        }

        return this.donationService.createDonation(campaignId, userId, dto, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    // API cho Frontend gọi hỏi thăm (Polling) trạng thái thanh toán
    @Get('/donations/status/:txReference')
    checkStatus(@Param('txReference') txReference: string) {
        return this.donationService.checkDonationStatus(txReference);
    }

    // API dọn rác Database khi user tắt Popup
    @Post('/donations/cancel/:txReference')
    cancelDonation(
        @Param('txReference') txReference: string,
        @Req() req: Request,
    ) {
        return this.donationService.cancelPendingDonation(txReference, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    // Xem sao kê của chiến dịch
    @Get('/donations/campaign/:campaignId')
    getDonations(@Param('campaignId') campaignId: string) {
        return this.donationService.getDonationsByCampaign(campaignId);
    }

    @Post('donations/webhook')
    handleWebhook(
        @Body() dto: any,
        @Req() req: Request,
    ) {
        return this.donationService.processPaymentWebhook(dto, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || 'PAYOS_WEBHOOK',
        });
    }


    // Xem sao kê của tất cả chiến dịch
    @Get('/donations/statement')
    getStatements(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20,
        @Query('keyword') keyword: string = '',
        @Query('sortBy') sortBy: string = 'createdAt',
        @Query('sortOrder') sortOrder: 'DESC' | 'ASC' = 'DESC'
    ) {
        return this.donationService.getStatements(page, limit, keyword, sortBy, sortOrder);
    }

    @Get('/donations/me')
    @UseGuards(AuthGuard('jwt'))
    getMyDonations(
        @CurrentUser() user: any
    ) {
        return this.donationService.getMyDonations(user.id);
    }
}