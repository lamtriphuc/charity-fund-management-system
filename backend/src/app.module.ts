import { DisbursementModule } from './modules/disbursements/disbursement.module';
import { SupportRequestModule } from './modules/support-requests/support-request.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { TransactionsModule } from './modules/donation/transactions.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { SystemModule } from './modules/system/system.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Biến môi trường dùng được ở mọi nơi mà không cần import lại
      envFilePath: '.env'
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: configService.get<number>('DB_PORT'),
        username: configService.get<string>('DB_USER'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_NAME'),

        autoLoadEntities: true,
        synchronize: true
      })
    }),
    UsersModule,
    CampaignsModule,
    TransactionsModule,
    LedgerModule,
    SystemModule,
    AuthModule,
    SupportRequestModule,
    DisbursementModule,
    CloudinaryModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
