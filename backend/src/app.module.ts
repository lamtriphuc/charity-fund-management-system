import { DisbursementModule } from './modules/disbursements/disbursement.module';
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/user.module';
import { CampaignsModule } from './modules/campaigns/campaigns.module';
import { DonationModule } from './modules/donations/donation.module';
import { LedgerModule } from './modules/ledger/ledger.module';
import { SystemModule } from './modules/system/system.module';
import { AuthModule } from './modules/auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule } from './common/cloudinary/cloudinary.module';
import { ScheduleModule } from '@nestjs/schedule';
import { CronModule } from './modules/cron/cron.module';
import { SeederModule } from './seeder/seeder.module';
import { AnalyticModule } from './modules/analytic/analytic.module';
import { SearchModule } from './modules/search/search.module';
import { AuditLogModule } from './modules/audit/audit-log.module';

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
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),

        autoLoadEntities: true,
        synchronize: true
      })
    }),
    SeederModule,
    UsersModule,
    CampaignsModule,
    DonationModule,
    LedgerModule,
    SystemModule,
    AuthModule,
    DisbursementModule,
    CloudinaryModule,
    CronModule,
    SearchModule,
    AnalyticModule,
    AuditLogModule,

    ScheduleModule.forRoot()
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_INTERCEPTOR,
    //   useClass: AuditLogInterceptor,
    // },
  ],
})
export class AppModule { }
