import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { User } from './entities/user.entity';
import { DatabaseSeederService } from './database-seeder.service';

@Module({
    imports: [TypeOrmModule.forFeature([Role, User])],
    providers: [DatabaseSeederService],
    controllers: [],
    exports: [TypeOrmModule]
})
export class UsersModule { }
