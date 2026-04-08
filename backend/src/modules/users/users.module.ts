import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { DatabaseSeederService } from './database-seeder.service';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { KycProfile } from './entities/kyc-profile.entity';
import { CloudinaryModule } from 'src/common/cloudinary/cloudinary.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Role, User, KycProfile]),
        CloudinaryModule
    ],
    providers: [UserService, DatabaseSeederService],
    controllers: [UserController],
    exports: [TypeOrmModule, UserService]
})
export class UsersModule { }
