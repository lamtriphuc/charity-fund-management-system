import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Donation } from "./entities/donation.entity";
import { DataSource, Repository } from "typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { CreateDonationDto, WebhookPaymentDto } from "./dto/donation.dto";
import { User } from "../users/entities/user.entity";
import { LedgerService } from "../ledger/ledger.service";
import { ConfigService } from "@nestjs/config";
import { Account } from "../ledger/entities/account.entity";

@Injectable()
export class DonationService {
    constructor(
        @InjectRepository(Donation) private readonly donationRepository: Repository<Donation>,
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly dataSource: DataSource,
        private readonly ledgerService: LedgerService,
    ) { }

    async createDonation(campaignId: string, userId: string | null, dto: CreateDonationDto) {
        const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
        if (!campaign || campaign.status !== "ACTIVE")
            throw new BadRequestException('Chiến dịch không tồn tại hoặc đã đóng.');

        const txReference = `TX-${Date.now()}${Math.floor(Math.random() * 1000)}`;

        let finalDonorName: string | null = null;

        if (!dto.isAnonymous) {
            if (dto.donorName) {
                finalDonorName = dto.donorName;
            } else if (userId) {
                const user = await this.userRepository.findOne({ where: { id: userId } });
                finalDonorName = user?.fullName ?? null;
            } else {
                finalDonorName = 'Khách vãn lai'
            }
        } else {
            finalDonorName = null;
        }

        const donation = this.donationRepository.create({
            campaign: { id: campaignId },
            donor: userId ? { id: userId } : null,
            amount: dto.amount,
            message: dto.message,
            isAnonymous: dto.isAnonymous,
            donorName: finalDonorName,
            paymentMethod: dto.paymentMethod,
            txReference: txReference,
            status: 'PENDING',
        });

        await this.donationRepository.save(donation);

        // TRONG THỰC TẾ: Chỗ này bạn sẽ gọi thư viện VNPay/Momo để tạo Link thanh toán
        // Tạm thời mình trả về thông tin giả lập
        return {
            message: 'Đã tạo phiên quyên góp. Vui lòng thanh toán.',
            txReference: txReference,
            amount: dto.amount,
            // mockPaymentUrl: `https://vnpay.vn/pay?tx=${txReference}...`
        };
    }

    async processPaymentWebhook(dto: WebhookPaymentDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Tìm giao dịch
            const donation = await queryRunner.manager.findOne(Donation, {
                where: { txReference: dto.txReference },
                relations: ['campaign'],
            });

            if (!donation) throw new NotFoundException('Không tìm thấy giao dịch');
            if (donation.status === 'SUCCESS') return { message: 'Giao dịch này đã được xử lý rồi' };

            // Giả lập logic: Nếu đối tác truyền status 'SUCCESS'
            if (dto.status === 'SUCCESS') {
                // Cập nhật trạng thái giao dịch
                donation.status = 'SUCCESS';
                await queryRunner.manager.save(donation);

                // TÍCH HỢP INTERNAL LEDGER
                // Nghiệp vụ: Nhận tiền tài trợ
                // Nợ (Debit) TK Ngân hàng: Tăng tài sản
                // Có (Credit) TK Quỹ Chiến dịch: Tăng nguồn vốn (trách nhiệm phải chi)

                // LẤY TÀI KHOẢN TỔNG TỪ DATABASE BẰNG MÃ 'SYS_CASH'
                const cashAccount = await queryRunner.manager.findOne(Account, {
                    where: { code: 'SYS_CASH' }
                });

                if (!cashAccount) {
                    throw new InternalServerErrorException('Lỗi nghiêm trọng: Không tìm thấy tài khoản ngân hàng tổng (SYS_CASH)');
                }

                await this.ledgerService.recordTransaction(
                    queryRunner.manager,
                    'DONATION',
                    donation.id,
                    [
                        {
                            accountId: cashAccount.id, // Lấy từ env hoặc cấu hình hằng số
                            isDebit: true, // Nợ
                            amount: Number(donation.amount)
                        },
                        {
                            // accountId: donation.campaign.fundAccountId, // Bảng Campaign nên chứa ID của TK Quỹ tương ứng
                            accountId: donation.campaign.fundAccountId,
                            isDebit: false, // Có
                            amount: Number(donation.amount)
                        }
                    ]
                );

                // Cộng tiền vào tổng của chiến dịch
                const campaign = donation.campaign;
                campaign.currentAmount = Number(campaign.currentAmount) + Number(donation.amount);
                await queryRunner.manager.save(campaign);
            } else {
                donation.status = 'FAILED';
                await queryRunner.manager.save(donation);
            }

            await queryRunner.commitTransaction();
            return { message: 'Xử lý Webhook thành công' };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async getDonationsByCampaign(campaignId: string) {
        const donations = await this.donationRepository.find({
            where: { campaign: { id: campaignId }, status: 'SUCCESS' },
            order: { createdAt: 'DESC' },
        });

        // Ẩn tên nếu họ chọn isAnonymous
        return donations.map(d => ({
            id: d.id,
            amount: d.amount,
            message: d.message,
            createdAt: d.createdAt,
            donorName: d.isAnonymous ? 'Nhà hảo tâm ẩn danh' : (d.donor?.fullName || 'Khách vãng lai'),
        }));
    }
}