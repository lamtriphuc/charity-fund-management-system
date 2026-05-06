import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { DonationService } from "./donation.service";
import { CreateDonationDto, WebhookPaymentDto } from "./dto/donation.dto";
import type { Request } from 'express';

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

        return this.donationService.createDonation(campaignId, userId, dto);
    }

    // API cho Frontend gọi hỏi thăm (Polling) trạng thái thanh toán
    @Get('/donations/status/:txReference')
    checkStatus(@Param('txReference') txReference: string) {
        return this.donationService.checkDonationStatus(txReference);
    }

    // API dọn rác Database khi user tắt Popup
    @Post('/donations/cancel/:txReference')
    cancelDonation(@Param('txReference') txReference: string) {
        return this.donationService.cancelPendingDonation(txReference);
    }

    // Xem sao kê của chiến dịch
    @Get('/donations/campaign/:campaignId')
    getDonations(@Param('campaignId') campaignId: string) {
        return this.donationService.getDonationsByCampaign(campaignId);
    }

    @Post('donations/webhook')
    handleWebhook(@Body() dto: any) {
        console.log('🎉 ĐÃ NHẬN ĐƯỢC WEBHOOK TỪ PAYOS:');
        console.log(JSON.stringify(dto, null, 2));
        return this.donationService.processPaymentWebhook(dto);
    }
}