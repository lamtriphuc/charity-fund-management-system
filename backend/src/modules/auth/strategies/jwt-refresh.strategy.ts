import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

const extractCookie = (req: Request) => {
    if (req && req.cookies) {
        return req.cookies['refresh_token'];
    }
    return null;
}

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(private configService: ConfigService) {
        super({
            jwtFromRequest: extractCookie,
            secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
            passReqToCallback: true, // Cần lấy nguyên cái token để so sánh với DB
        });
    }

    async validate(req: Request, payload: any) {
        const refreshToken = req.cookies['refresh_token'];

        if (!refreshToken) throw new ForbiddenException('Thiếu Refresh Token');

        return { ...payload, refreshToken };
    }
}