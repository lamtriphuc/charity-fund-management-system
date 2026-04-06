import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { DatabaseSeederService } from './database-seeder.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { KycProfile } from './entities/kyc-profile.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Role, User, KycProfile])],
    providers: [UserService, DatabaseSeederService],
    controllers: [UserController],
    exports: [TypeOrmModule, UserService]
})
export class UsersModule { }
