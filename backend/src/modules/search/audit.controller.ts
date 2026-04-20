import { Controller, Get, Query } from "@nestjs/common";
import { SearchService } from "./search.service";

@Controller('/admin/audit-logs')
export class AuditController {
    constructor(private readonly searchService: SearchService) { }

    @Get()
    async getSystemLogs(
        @Query('page') page: string = '1',
        @Query('limit') limit: string = '20'
    ) {
        const pageNum = parseInt(page, 10);
        const limitNum = parseInt(limit, 10);

        return this.searchService.searchAuditLogs(pageNum, limitNum);
    }
}