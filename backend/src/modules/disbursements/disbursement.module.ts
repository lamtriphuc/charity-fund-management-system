import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Disbursement } from './entities/disbursement.entity';
import { DisbursementProof } from './entities/disbursement-proof.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { DisbursementController } from './disbursement.controller';
import { DisbursementService } from './disbursement.service';
import { CloudinaryModule } from 'src/common/cloudinary/cloudinary.module';

@Module({
    imports: [
        CloudinaryModule,
        TypeOrmModule.forFeature([Disbursement, DisbursementProof, Campaign])
    ],
    controllers: [DisbursementController],
    providers: [DisbursementService],
})
export class DisbursementModule { }
