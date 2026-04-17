import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { Repository } from "typeorm";
import { Account } from "../ledger/entities/account.entity";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Donation } from "../donations/entities/donation.entity";
import { Disbursement } from "../disbursements/entities/disbursement.entity";
import { LedgerTransaction } from "../ledger/entities/ledger-transaction.entity";
import { LedgerLine } from "../ledger/entities/ledger-line.entity";

import * as crypto from 'crypto';

@Injectable()
export class ReconciliationService {
    private readonly logger = new Logger(ReconciliationService.name);

    constructor(
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
        @InjectRepository(Donation) private readonly donationRepository: Repository<Donation>,
        @InjectRepository(Disbursement) private readonly disbursementRepository: Repository<Disbursement>,
        @InjectRepository(LedgerTransaction) private readonly ledgerTransactionRepository: Repository<LedgerTransaction>,
        @InjectRepository(LedgerLine) private readonly ledgerLineRepository: Repository<LedgerLine>,
    ) { }

    @Cron(CronExpression.EVERY_10_SECONDS)
    async handleReconciliation() {
        this.logger.log('Bắt đầu tiến trình Đối soát Kế toán tự động...');

        try {
            // --- BƯỚC 1: XÁC THỰC TÍNH TOÀN VẸN CỦA CHUỖI HASH (LEDGER VERIFICATION) ---
            // Nếu chuỗi Hash bị gãy, khóa toàn bộ hệ thống ngay lập tức!
            const allLedgerTxs = await this.ledgerTransactionRepository.find({
                order: { createdAt: 'ASC' } // Bắt buộc quét từ cũ nhất đến mới nhất
            });

            let expectedPreviousHash = 'GENESIS_HASH_0000000000000000';
            let isLedgerBroken = false;
            let brokenTxId: string | null = null;

            for (const tx of allLedgerTxs) {
                // 1. Kiểm tra "móc xích": Hash trước của block này có khớp với Hash của block trước không?
                if (tx.previousHash !== expectedPreviousHash) {
                    isLedgerBroken = true;
                    brokenTxId = tx.id;
                    this.logger.error(`\n GÃY CHUỖI HASH TẠI GIAO DỊCH: ${tx.id}`);
                    this.logger.error(`Kỳ vọng PreviousHash: ${expectedPreviousHash}`);
                    this.logger.error(`Thực tế trong DB: ${tx.previousHash}`);
                    break; // Dừng kiểm tra ngay khi phát hiện lỗi
                }

                // 2. Kiểm tra "ruột" (Dữ liệu bên trong có bị sửa không?)
                // Lấy lại các bút toán (entries) của giao dịch này
                const lines = await this.ledgerLineRepository.find({
                    where: { ledgerTransaction: { id: tx.id } },
                    relations: ['account']
                });

                // Tái tạo lại payload hệt như lúc lưu
                const entries = lines.map(l => ({ accountId: l.account.id, isDebit: l.isDebit, amount: Number(l.amount) }));
                const sortedEntries = entries.sort((a, b) => a.accountId.localeCompare(b.accountId));
                const payload = JSON.stringify({ referenceType: tx.referenceType, referenceId: tx.referenceId, entries: sortedEntries });

                // Tính toán lại mã Hash từ dữ liệu hiện tại trong DB
                const recalculatedHash = this.generateHash(payload, tx.previousHash);

                if (recalculatedHash !== tx.currentHash) {
                    isLedgerBroken = true;
                    brokenTxId = tx.id;
                    this.logger.error(`\n DỮ LIỆU SỔ CÁI BỊ CHỈNH SỬA TẠI GIAO DỊCH: ${tx.id}`);
                    this.logger.error(`Mã Hash gốc: ${tx.currentHash}`);
                    this.logger.error(`Mã Hash tính lại: ${recalculatedHash}`);
                    break;
                }

                // Cập nhật lại expectedPreviousHash cho vòng lặp tiếp theo
                expectedPreviousHash = tx.currentHash;
            }

            if (isLedgerBroken) {
                this.logger.error(` ĐÃ PHONG TỎA TOÀN BỘ HỆ THỐNG DO SỔ CÁI BỊ TẤN CÔNG (ID: ${brokenTxId})!\n`);
                // TODO: Gửi cảnh báo đỏ cho Admin/Auditor, ngắt kết nối thanh toán...
                return; // Dừng ngay lập tức, không đối soát số dư nữa vì Sổ cái đã bị ô nhiễm
            }



            // --- BƯỚC 2: TIẾN HÀNH ĐỐI SOÁT CHÉO 3 GÓC (TRIANGULATION) ---


            // Lấy tất cả chiến dịch đang Active
            const campaigns = await this.campaignRepository.find({
                where: { status: 'ACTIVE' }
            });

            for (const campaign of campaigns) {
                if (!campaign.fundAccountId) continue;

                // --- LẤY SỐ LIỆU TỪ 3 NGUỒN KHÁC NHAU ---

                // Nguồn 1: sổ cái
                const fundAccount = await this.accountRepository.findOne({
                    where: { id: campaign.fundAccountId }
                });
                if (!fundAccount) {
                    this.logger.error(`[CRITICAL] Không tìm thấy Tài khoản Kế toán của Campaign ID: ${campaign.id}`);
                    continue;
                }
                const ledgerBalance = Number(fundAccount.balance);

                // Nguồn 2: Dữ liệu hiển thị (App hiển thị cho người dùng)
                const displayBalance = Number(campaign.currentAmount);

                // Nguồn 3: CỘNG DỒN TỪ CHỨNG TỪ GỐC (Trực tiếp từ Database)
                // a. Tổng tiền Quyên góp vào
                const { totalIn } = await this.donationRepository
                    .createQueryBuilder('donation')
                    .select('SUM(donation.amount)', 'totalIn')
                    .where('donation.campaign_id = :id AND donation.status = :status', { id: campaign.id, status: 'SUCCESS' })
                    .getRawOne();

                // b. Tổng tiền Giải ngân ra
                const { totalOut } = await this.disbursementRepository
                    .createQueryBuilder('disbursement')
                    .select('SUM(disbursement.amount)', 'totalOut')
                    .where('disbursement.campaign_id = :id AND disbursement.status = :status', { id: campaign.id, status: 'TRANSFERRED' })
                    .getRawOne();

                // Tính toán số dư thực tế từ chứng từ gốc
                const actualDocumentBalance = Number(totalIn || 0) - Number(totalOut || 0);



                let isTampered = false;
                let alertMessage = '';

                // Check 1: Sổ cái có khớp với App không
                if (Math.abs(ledgerBalance - displayBalance) > 0.01) {
                    isTampered = true;
                    alertMessage += `\n Lệch Sổ cái (${ledgerBalance}) vs App (${displayBalance})`;
                }

                // Check 2: Chứng từ gốc có khớp với App không? (Bắt lỗi bạn vừa hack)
                if (Math.abs(actualDocumentBalance - displayBalance) > 0.01) {
                    isTampered = true;
                    alertMessage += `\n Chứng từ gốc bị sửa đổi! Tổng thực tế: ${actualDocumentBalance} vs App: ${displayBalance}`;
                }

                // --- BƯỚC 3: XỬ LÝ NẾU PHÁT HIỆN GIAN LẬN ---
                if (isTampered) {
                    this.logger.error(`\n PHÁT HIỆN GIAN LẬN TẠI CHIẾN DỊCH: [${campaign.title}]`);
                    this.logger.error(alertMessage);

                    campaign.status = 'SUSPENDED';
                    await this.campaignRepository.save(campaign);
                    this.logger.warn(` Đã KHÓA chiến dịch ${campaign.id} để phong tỏa tài sản.\n`);
                }

                // TODO (Tương lai): Gửi Email/SMS khẩn cấp cho BAN KIỂM SOÁT (AUDITOR)
            }

            this.logger.log(' Hoàn tất tiến trình Đối soát.');
        } catch (error) {
            this.logger.error(` Tiến trình đối soát thất bại vì lỗi: ${error.message}`);
            this.logger.error(error.stack); // In ra chi tiết dòng code gây lỗi
        }
    }

    private generateHash(payload: any, previousHash: string): string {
        const data = `${payload}|${previousHash}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}