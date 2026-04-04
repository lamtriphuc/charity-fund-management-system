import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApproveKycDto, SubmitKycDto } from './dto/user.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';

@Controller('users')
export class UserController {
    constructor(private readonly usersService: UserService) { }

    // 1. API: User xem profile của chính mình
    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    getProfile(@CurrentUser() user: any) {
        return this.usersService.getProfile(user.id);
    }

    // 2. API: User tự gửi hồ sơ KYC
    @Patch('me/kyc')
    @UseGuards(AuthGuard('jwt'))
    submitKyc(
        @CurrentUser() user: any,
        @Body() dto: SubmitKycDto
    ) {
        return this.usersService.submitKyc(user.id, dto);
    }

    // 3. API: Admin duyệt và nâng cấp
    @Patch(':id/approve-kyc')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    approveKyc(
        @Param('id') id: string, // ID của user đang bị xét duyệt
        @Body() dto: ApproveKycDto
    ) {
        return this.usersService.approveKycAndUpgrade(id, dto);
    }
}
