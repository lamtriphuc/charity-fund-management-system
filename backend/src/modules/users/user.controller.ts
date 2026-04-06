import { Body, Controller, Get, Param, Patch, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ApproveKycDto, SubmitKycDto } from './dto/user.dto';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

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
    @UseInterceptors(
        FileFieldsInterceptor(
            [
                { name: 'frontImage', maxCount: 1 },
                { name: 'backImage', maxCount: 1 },
            ],
            {
                storage: diskStorage({
                    destination: './uploads/kyc',
                    filename: (req, file, cb) => {
                        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                        cb(null, `kyc-${uniqueSuffix}${extname(file.originalname)}`);
                    },
                }),
            }
        )
    )
    submitKyc(
        @CurrentUser() user: any,
        @Body() dto: SubmitKycDto,
        @UploadedFiles() files: { frontImage?: Express.Multer.File[], backImage?: Express.Multer.File[] }
    ) {
        const frontPath = files?.frontImage?.[0]?.path || '';
        const backPath = files?.backImage?.[0]?.path || '';
        return this.usersService.submitKyc(user.id, dto, frontPath, backPath);
    }

    // 3. API: Admin duyệt và nâng cấp
    @Patch('kyc-profiles/:kycId/approve')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    approveKyc(
        @Param('kycId') kycId: string,
        @Body() dto: ApproveKycDto
    ) {
        return this.usersService.approveKyc(kycId, dto);
    }
}
