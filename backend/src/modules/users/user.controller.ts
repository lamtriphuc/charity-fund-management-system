import { BadRequestException, Body, Controller, Get, Param, Patch, Query, Req, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApproveKycDto, Permission, UpdateUserDto } from './dto/user.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { RequirePermissions } from 'src/common/decorators/permissions.decorator';
import type { Request } from 'express';

@Controller('users')
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Patch('me/kyc')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(
        FileFieldsInterceptor([
            { name: 'frontImage', maxCount: 1 },
            { name: 'backImage', maxCount: 1 },
            { name: 'portraitImage', maxCount: 1 },
        ])
    )
    submitKyc(
        @CurrentUser() user: any,
        @UploadedFiles() files: {
            frontImage?: Express.Multer.File[],
            backImage?: Express.Multer.File[],
            portraitImage?: Express.Multer.File[]
        },
        @Req() req: Request,
    ) {
        return this.userService.submitKyc(
            user,
            files?.frontImage?.[0],
            files?.backImage?.[0],
            files?.portraitImage?.[0],
            {
                ipAddress: req.ip,
                userAgent: req.headers['user-agent'] || null,
            },
        );
    }

    // 3. API: Admin duyệt và nâng cấp
    @Patch('kyc-profiles/:kycId/approve')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    approveKyc(
        @CurrentUser() currentUser: any,
        @Param('kycId') kycId: string,
        @Body() dto: ApproveKycDto,
        @Req() req: Request,
    ) {
        return this.userService.approveKyc(kycId, dto, currentUser, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    @Get()
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async getAllUsers(
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('keyword') keyword?: string,
        @Query('role') role?: string
    ) {
        return this.userService.findAllForAdmin(page, limit, keyword, role);
    }

    @Get('kyc-profiles')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    getKycProfilesForAdmin(
        @Query('status') status?: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('keyword') keyword?: string,
    ) {
        return this.userService.findKycProfilesForAdmin(
            status,
            Number(page) || 1,
            Number(limit) || 10,
            keyword,
        );
    }

    @Patch(':id/status')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN', 'SUPER_ADMIN')
    async updateUserStatus(
        @CurrentUser() currentUser: any,
        @Param('id') id: string,
        @Body('status') status: string,
        @Req() req: Request,
    ) {
        return this.userService.updateStatus(id, status, currentUser, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    // API Cấp quyền người dùng
    @Patch(':id/role')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('SUPER_ADMIN')
    async assignRole(
        @CurrentUser() currentUser: any,
        @Param('id') id: string,
        @Body('roleName') roleName: string,
        @Req() req: Request,
    ) {
        return this.userService.updateRole(id, roleName, currentUser, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    @Patch('/me/avatar')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('avatar'))
    async updateAvatar(
        @CurrentUser() user: any,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,

    ) {
        if (!file) {
            throw new BadRequestException('Vui lòng chọn một file ảnh!');
        }

        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
            throw new BadRequestException('Chỉ chấp nhận file định dạng hình ảnh!');
        }

        return this.userService.updateAvatar(user.id, file, user, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    @Patch('me')
    @UseGuards(AuthGuard('jwt'))
    async updateProfile(
        @CurrentUser() user: any,
        @Body() dto: UpdateUserDto,
        @Req() req: Request,
    ) {
        return this.userService.updateProfile(user.id, dto, user, {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'] || null,
        });
    }

    @Get('me/kyc/history')
    @UseGuards(AuthGuard('jwt'))
    async getMyKycHistory(@CurrentUser() user: any) {
        return this.userService.getMyKycHistory(user.id);
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@CurrentUser() user: any) {
        return this.userService.getProfile(user.id);
    }
}
