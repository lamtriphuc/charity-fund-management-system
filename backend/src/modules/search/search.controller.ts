import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { SearchService } from "./search.service";
import { AuthGuard } from "@nestjs/passport";
import { RolesGuard } from "src/common/guards/roles.guard";
import { Roles } from "src/common/decorators/roles.decorator";

@Controller()
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get('/auditor/audit-logs')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('AUDITOR', 'ADMIN', 'SUPER_ADMIN')
    async getSystemLogs(
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20,
        @Query('keyword') keyword?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.searchService.searchAuditLogs(page, limit, keyword, startDate, endDate);
    }
}