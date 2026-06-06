import { Controller, Get, Res, UseGuards } from "@nestjs/common";
import { AnalyticService } from "./analytic.service";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";
import type { Response } from "express";

@Controller('admin')
export class AnalyticController {
    constructor(private readonly analyticService: AnalyticService) { }

    @Get('dashboard-stats')
    async getStats() {
        return this.analyticService.getDashboardStats();
    }

    @Get('export/disbursements')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'AUDITOR')
    async downloadDisbursementReport(@Res() res: Response) {
        const buffer = await this.analyticService.exportDisbursementReport();

        res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-giai-ngan.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

        return res.end(buffer);
    }
}