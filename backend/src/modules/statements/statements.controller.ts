import { Controller, Get, Param } from "@nestjs/common";
import { StatementService } from "./statements.service";

@Controller('public/statements')
export class StatementController {
    constructor(private readonly statementService: StatementService) { }

    @Get('campaigns/:campaignId')
    getStatement(@Param('campaignId') campaignId: string) {
        return this.statementService.getRealtimeStatement(campaignId);
    }
}