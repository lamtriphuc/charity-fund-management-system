import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Donation } from "../donations/entities/donation.entity";
import { Disbursement } from "../disbursements/entities/disbursement.entity";

@Injectable()
export class StatementService {
    constructor(
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(Donation) private readonly donationRepository: Repository<Donation>,
        @InjectRepository(Disbursement) private readonly disbursementRepository: Repository<Disbursement>,
    ) { }

    async getRealtimeStatement(campaignId: string) {
        // 1. Kiểm tra chiến dịch
        const campaign = await this.campaignRepository.findOne({
            where: { id: campaignId },
            select: ['id', 'title', 'currentAmount', 'status']
        });

        if (!campaign) throw new NotFoundException('Không tìm thấy chiến dịch');

        // 2. Lấy danh sách Tiền VÀO (Donations đã SUCCESS)
        const donations = await this.donationRepository.find({
            where: { campaign: { id: campaignId }, status: 'SUCCESS' },
            select: ['id', 'donorName', 'amount', 'message', 'createdAt', 'hash', 'previousHash', 'txReference'],
        });

        // 3. Lấy danh sách Tiền RA (Disbursements đã Transferred)
        const disbursements = await this.disbursementRepository.find({
            where: { campaign: { id: campaignId }, status: 'Transferred' },
            relations: ['supportRequest'], // Join để lấy mục đích xin ứng tiền
        });

        // 4. Chuẩn hóa dữ liệu (Format lại thành 1 mảng chung)
        const formattedDonations = donations.map(d => ({
            type: 'IN', // Tiền vào
            actor: d.donorName || 'Khách vãng lai',
            amount: Number(d.amount),
            message: d.message,
            txReference: d.txReference,
            date: d.createdAt,
            security: {
                hash: d.hash,
                previousHash: d.previousHash
            }
        }));

        const formattedDisbursements = disbursements.map(db => ({
            type: 'OUT', // Tiền ra
            actor: 'Ban Quản Trị (Giải ngân)',
            amount: Number(db.amount),
            message: db.supportRequest?.description || 'Chi tiền hoạt động',
            txReference: db.txReference, // Mã giao dịch mà Admin đã nhập
            date: db.createdAt,
            // (Nếu bảng Disbursement bạn cũng làm hàm tính Hash thì xuất ra ở đây)
        }));

        // 5. Trộn 2 mảng lại và sắp xếp MỚI NHẤT lên đầu
        const allTransactions = [...formattedDonations, ...formattedDisbursements]
            .sort((a, b) => b.date.getTime() - a.date.getTime());

        return {
            campaignInfo: {
                id: campaign.id,
                title: campaign.title,
                balanceRemaining: Number(campaign.currentAmount),
                status: campaign.status
            },
            totalTransactions: allTransactions.length,
            statement: allTransactions
        };
    }
}