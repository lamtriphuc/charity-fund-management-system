import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { AuthGuard } from '@nestjs/passport';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import { Permission } from '../users/dto/user.dto';

@Controller('ledger')
export class LedgerController {
    constructor(private readonly ledgerService: LedgerService) { }

    @Get('balances')
    @UseGuards(AuthGuard('jwt'))
    async getBalances() {
        return this.ledgerService.getSystemBalances();
    }

    @Get('lines')
    @UseGuards(AuthGuard('jwt'))
    async getLines(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('keyword') keyword?: string
    ) {
        return this.ledgerService.getLedgerLines(Number(page) || 1, Number(limit) || 20, keyword);
    }
}