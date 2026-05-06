// src/database/seeder/seeder.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatabaseSeederService } from './database-seeder.service';
import { User } from 'src/modules/users/entities/user.entity';
import { Role } from 'src/modules/users/entities/role.entity';
import { Account } from 'src/modules/ledger/entities/account.entity';
import { Campaign } from 'src/modules/campaigns/entities/campaign.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([User, Role, Account, Campaign]),
    ],
    providers: [DatabaseSeederService],
    exports: [DatabaseSeederService],
})
export class SeederModule { }