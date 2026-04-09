import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { SupportRequestService } from "./support-requests.service";
import { CreateSupportRequestDto, UpdateSupportRequestStatusDto } from "./dto/support-request.dto";
import { CurrentUser } from "src/common/decorators/current-user.decorator";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";

@Controller('campaigns/:campaignId/support-requests')
export class SupportRequestController {
    constructor(private readonly supportRequestService: SupportRequestService) { }

    // TNV xin tạm ứng
    @Post()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('VOLUNTEER')
    createRequest(
        @Param('campaignId') campaignId: string,
        @Body() dto: CreateSupportRequestDto,
        @CurrentUser() user: any
    ) {
        return this.supportRequestService.createRequest(campaignId, user.id, dto);
    }

    @Patch(':requestId/status')
    updateStatus(
        @Param('requestId') requestId: string,
        @Body() dto: UpdateSupportRequestStatusDto
    ) {
        return this.supportRequestService.updateStatus(requestId, dto);
    }

    @Get()
    getRequests(@Param('campaignId') campaignId: string) {
        return this.supportRequestService.getRequestsByCampaign(campaignId);
    }
}