import { Body, Controller, Get, HttpCode, HttpStatus, Post, Res, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleLoginDto, LoginDto, RegisterDto } from './dto/auth.dto';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { Response } from 'express';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserService } from '../users/user.service';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly userService: UserService
    ) { }

    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
        const loginData = await this.authService.login(dto);
        const { accessToken, refreshToken, user } = loginData;

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true, // Trình duyệt ẩn cookie này khỏi JavaScript
            secure: false,  // Đặt là true nếu chạy trên HTTPS (Production)
            sameSite: 'lax', // Bảo vệ khỏi tấn công CSRF
            maxAge: 7 * 24 * 60 * 60 * 1000, // Sống 7 ngày (trùng với thời gian sống của token)
        });

        return { accessToken, user };
    }

    // Bắt buộc phải có Access Token mới được gọi API này
    @UseGuards(AuthGuard('jwt'))
    @Post('logout')
    async logout(
        @CurrentUser() user: any,
        @Res({ passthrough: true }) res: Response
    ) {
        await this.authService.logout(user.id);
        res.clearCookie('refresh_token');

        return { message: 'Đăng xuất thành công' };
    }

    // Dùng chiến lược jwt-refresh để check token
    @UseGuards(AuthGuard('jwt-refresh'))
    @Post('refresh')
    async refreshTokens(
        @CurrentUser() user: any,
        @Res({ passthrough: true }) res: Response
    ) {
        // Thuộc tính refreshToken được nhét vào từ file jwt-refresh.strategy.ts
        const tokens = await this.authService.refreshTokens(user.sub, user.refreshToken);

        res.cookie('refresh_token', tokens.refreshToken, {
            httpOnly: true,
            secure: false, // Prod thì đổi thành true
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { access_token: tokens.accessToken };
    }

    @Post('google')
    @HttpCode(HttpStatus.OK)
    async googleLogin(
        @Body('token') token: string,
        @Res({ passthrough: true }) res: Response // Thêm @Res vào đây
    ) {
        const loginData = await this.authService.googleLogin(token);
        const { accessToken, refreshToken, user } = loginData;

        res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return { accessToken, user };
    }

    @Post('test')
    @UseGuards(AuthGuard('jwt'), RolesGuard)
    @Roles('ADMIN')
    test() {
        return 'test'
    }

    @Get('me')
    @UseGuards(AuthGuard('jwt'))
    getProfile(@CurrentUser() user: any) {
        return this.userService.getProfile(user.id);
    }
}
