import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Donation } from "../donations/entities/donation.entity";
import { LessThan, Repository } from "typeorm";
import { LedgerService } from "../ledger/ledger.service";
import { Cron, CronExpression } from "@nestjs/schedule";

@Injectable()
export class RefundCronService {
    private readonly logger = new Logger(RefundCronService.name);

    constructor(
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(Donation) private readonly donationRepository: Repository<Donation>,
        private readonly ledgerService: LedgerService,
    ) { }

    // Quét vào lúc 00:01 mỗi ngày (Dùng EVERY_MINUTE nếu bạn muốn test ngay)
    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async processExpiredFixedCampaigns() {
        this.logger.log('🔄 Bắt đầu quét các chiến dịch Fixed hết hạn...');

        const now = new Date();

        // Tìm các chiến dịch Fixed, Đang active, Đã quá hạn, và Chưa đạt mục tiêu
        const failedCampaigns = await this.campaignRepository.find({
            where: {
                campaignType: 'FIXED',          // Giả định bạn có cột type
                status: 'Active',
                endDate: LessThan(now), // Đã hết hạn
            },
        });

        for (const campaign of failedCampaigns) {
            // Kiểm tra lại lần cuối: Đạt mục tiêu chưa?
            if (Number(campaign.currentAmount) < Number(campaign.targetAmount)) {
                this.logger.warn(` Chiến dịch [${campaign.title}] THẤT BẠI. Bắt đầu hoàn tiền...`);

                // 1. Đổi trạng thái chiến dịch thành Failed/Refunding
                campaign.status = 'FAILED';
                await this.campaignRepository.save(campaign);

                // 2. Lấy toàn bộ danh sách Quyên góp thành công của chiến dịch này
                const donations = await this.donationRepository.find({
                    where: { campaign: { id: campaign.id }, status: 'SUCCESS' },
                });

                // 3. Thực hiện hoàn tiền cho TỪNG người
                for (const donation of donations) {
                    try {
                        // Gọi hàm Ledger để tạo bút toán ngược
                        await this.ledgerService.refundDonation(
                            donation.id,
                            campaign.fundAccountId,
                            Number(donation.amount),
                            donation.txReference
                        );

                        // Cập nhật trạng thái Hóa đơn quyên góp
                        donation.status = 'REFUNDED';
                        await this.donationRepository.save(donation);

                        // Tích hợp: Bắn API qua Cổng thanh toán (VNPay/Momo) để trả tiền thật về thẻ (Nếu có hợp đồng Payout)
                        // Lệnh giả lập: await this.paymentGateway.refund(donation.txReference, donation.amount);

                        this.logger.log(` Đã hoàn tiền ${donation.amount} cho giao dịch ${donation.txReference}`);
                    } catch (error) {
                        this.logger.error(` Lỗi hoàn tiền giao dịch ${donation.id}: ${error.message}`);
                        // Ghi log để Admin vào xử lý tay
                    }
                }

                // 4. Reset số dư chiến dịch về 0
                campaign.currentAmount = 0;
                await this.campaignRepository.save(campaign);
                this.logger.log(` Hoàn tất xử lý chiến dịch [${campaign.title}]`);
            } else {
                // Nếu đã đủ mục tiêu nhưng hết hạn -> Chuyển sang Completed để chờ Giải ngân
                campaign.status = 'COMPLETED';
                await this.campaignRepository.save(campaign);
            }
        }
    }
}