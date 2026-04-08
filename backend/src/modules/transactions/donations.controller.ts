import { Body, Controller, Get, Param, Post, Req } from "@nestjs/common";
import { DonationService } from "./donation.service";
import { CreateDonationDto, WebhookPaymentDto } from "./dto/donation.dto";
import type { Request } from 'express';

@Controller()
export class DonationController {
    constructor(private readonly donationService: DonationService) { }

    // tạo quyên góp
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

    // Xem sao kê của chiến dịch
    @Get('/campaigns/:campaignId/donations')
    getDonations(@Param('campaignId') campaignId: string) {
        return this.donationService.getDonationsByCampaign(campaignId);
    }

    @Post('donations/webhook')
    handleWebhook(@Body() dto: WebhookPaymentDto) {
        return this.donationService.processPaymentWebhook(dto);
    }
}