import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) { }

    @Get('overview')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'AUDITOR')
    getOverview() {
        return this.dashboardService.getAdminOverview();
    }
}