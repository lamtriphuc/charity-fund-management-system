import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Repository } from "typeorm";
import { Account } from "../ledger/entities/account.entity";

@Injectable()
export class ReconciliationService {
    private readonly logger = new Logger(ReconciliationService.name);

    constructor(
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(Account) private readonly accountRepository: Repository<Account>

    ) { }

    async handleReconciliation() {
        this.logger.log('Bắt đầu tiến trình Đối soát Kế toán tự động...');

        // Lấy tất cả chiến dịch đang Active
        const campaigns = await this.campaignRepository.find({
            where: { status: 'ACTIVCE' }
        });

        for (const campaign of campaigns) {
            // Bỏ qua các chiến dịch cũ chưa được cấp fundAccountId
            if (!campaign.fundAccountId) continue;

            // Lấy tài khoản Sổ cái tương ứng của Chiến dịch
            const fundAccount = await this.accountRepository.findOne({
                where: { id: campaign.fundAccountId }
            });

            if (!fundAccount) {
                this.logger.error(`[CRITICAL] Không tìm thấy Tài khoản Kế toán của Campaign ID: ${campaign.id}`);
                continue;
            }

            const ledgerBalance = Number(fundAccount.balance);
            const displayBalance = Number(campaign.currentAmount);

            // KIỂM TRA ĐỐI SOÁT: Sổ cái có khớp với số dư hiển thị ngoài App không?
            if (Math.abs(ledgerBalance - displayBalance) > 0.01) { // Lệch dù chỉ 1 xu

                this.logger.error(`\n PHÁT HIỆN GIAN LẬN / SAI LỆCH DỮ LIỆU TẠI CHIẾN DỊCH: ${campaign.title}`);
                this.logger.error(` Sổ cái (Ledger) ghi nhận: ${ledgerBalance} VNĐ`);
                this.logger.error(` Hiển thị (Campaign) ghi nhận: ${displayBalance} VNĐ`);

                // HÀNH ĐỘNG KHẨN CẤP: Tự động khóa chiến dịch
                campaign.status = 'SUSPENDED'; // Chuyển sang trạng thái đình chỉ
                await this.campaignRepository.save(campaign);
                this.logger.warn(` Đã tự động KHÓA chiến dịch ${campaign.id} để điều tra.\n`);

                // TODO (Tương lai): Gửi Email/SMS khẩn cấp cho BAN KIỂM SOÁT (AUDITOR)
            }

            this.logger.log('✅ Hoàn tất tiến trình Đối soát.');
        }
    }
}