import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { JwtModule } from '@nestjs/jwt';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { Role } from '../users/entities/role.entity';
import { UsersModule } from '../users/user.module';
import { PassportModule } from '@nestjs/passport';
import { AuditLogModule } from '../audit/audit-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({}),
    UsersModule,
    AuditLogModule
  ],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy],
  controllers: [AuthController],
  exports: [JwtAccessStrategy, JwtRefreshStrategy],
})
export class AuthModule { }
