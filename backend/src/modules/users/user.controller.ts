import { BadRequestException, Body, Controller, Get, Param, Patch, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApproveKycDto, UpdateUserDto } from './dto/user.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';

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
        }
    ) {
        return this.userService.submitKyc(
            user.id,
            files?.frontImage?.[0],
            files?.backImage?.[0],
            files?.portraitImage?.[0]
        );
    }

    // 3. API: Admin duyệt và nâng cấp
    @Patch('kyc-profiles/:kycId/approve')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    approveKyc(
        @Param('kycId') kycId: string,
        @Body() dto: ApproveKycDto
    ) {
        return this.userService.approveKyc(kycId, dto);
    }

    @Patch('/me/avatar')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('avatar'))
    async updateAvatar(
        @CurrentUser() user: any,
        @UploadedFile() file: Express.Multer.File
    ) {
        if (!file) {
            throw new BadRequestException('Vui lòng chọn một file ảnh!');
        }

        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
            throw new BadRequestException('Chỉ chấp nhận file định dạng hình ảnh!');
        }

        return this.userService.updateAvatar(user.id, file);
    }

    @Patch('me')
    @UseGuards(AuthGuard('jwt'))
    async updateProfile(
        @CurrentUser() user: any,
        @Body() dto: UpdateUserDto
    ) {
        return this.userService.updateProfile(user.id, dto);
    }
}
