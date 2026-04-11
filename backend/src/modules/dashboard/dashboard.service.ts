import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Donation } from '../donations/entities/donation.entity';
import { Disbursement } from '../disbursements/entities/disbursement.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { KycProfile } from '../users/entities/kyc-profile.entity';
import { DisbursementProof } from '../disbursements/entities/disbursement-proof.entity';

@Injectable()
export class DashboardService {
    constructor(
        @InjectRepository(Donation) private donationRepository: Repository<Donation>,
        @InjectRepository(Disbursement) private disbursementRepository: Repository<Disbursement>,
        @InjectRepository(Campaign) private campaignRepository: Repository<Campaign>,
        @InjectRepository(KycProfile) private kycRepository: Repository<KycProfile>,
        @InjectRepository(DisbursementProof) private proofRepository: Repository<DisbursementProof>,
    ) { }

    async getAdminOverview() {
        // 1. Tính tổng tiền đã nhận (Donations có status = SUCCESS)
        const { totalDonations } = await this.donationRepository
            .createQueryBuilder('donation')
            .select('SUM(donation.amount)', 'totalDonations')
            .where('donation.status = :status', { status: 'SUCCESS' })
            .getRawOne();

        // 2. Tính tổng tiền đã xuất (Disbursements có status = Transferred)
        const { totalDisbursements } = await this.disbursementRepository
            .createQueryBuilder('disbursement')
            .select('SUM(disbursement.amount)', 'totalDisbursements')
            .where('disbursement.status = :status', { status: 'TRANSFERED' })
            .getRawOne();

        // 3. Đếm số chiến dịch đang hoạt động
        const activeCampaigns = await this.campaignRepository.count({
            where: { status: 'Active' },
        });

        // 4. Nhắc việc Admin: Số hồ sơ KYC đang chờ duyệt
        const pendingKycs = await this.kycRepository.count({
            where: { status: 'PENDING' },
        });

        // 5. Nhắc việc Kiểm toán: Số hóa đơn đang chờ soi
        const pendingProofs = await this.proofRepository.count({
            where: { verificationStatus: 'PENDING_AUDIT' },
        });

        // Ép kiểu về số (vì SUM trong SQL thường trả về chuỗi)
        return {
            financials: {
                totalReceived: Number(totalDonations || 0),
                totalDisbursed: Number(totalDisbursements || 0),
                fundBalance: Number(totalDonations || 0) - Number(totalDisbursements || 0), // Tiền tồn quỹ thật
            },
            metrics: {
                activeCampaigns,
                pendingKycs,
                pendingProofs,
            }
        };
    }
}