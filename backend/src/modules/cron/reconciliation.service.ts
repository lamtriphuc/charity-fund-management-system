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
import { CampaignStatus } from "../campaigns/dto/campaign.dto";
import { NotificationType } from "../system/entities/notification.entity";
import { NotificationService } from "../system/notification.service";
import { AuditLogService } from "../audit/audit-log.service";
import { AuditLogSeverity, AuditLogStatus } from "../audit/dto/create-audit-log.dto";

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
        private readonly notificationService: NotificationService,
        private readonly auditLogService: AuditLogService,
    ) { }

    // @Cron(CronExpression.EVERY_10_SECONDS)
    @Cron(CronExpression.EVERY_HOUR)
    async handleReconciliation() {
        this.logger.log('Bắt đầu tiến trình Đối soát Kế toán tự động...');

        try {
            // --- XÁC THỰC TÍNH TOÀN VẸN CỦA CHUỖI HASH (LEDGER VERIFICATION) ---
            const allLedgerTxs = await this.ledgerTransactionRepository.find({
                relations: ['lines', 'lines.account'],
                order: { createdAt: 'ASC' }
            });

            let expectedPreviousHash = 'GENESIS_HASH_0000000000000000';
            let isLedgerBroken = false;
            let brokenTxId: string | null = null;

            for (const tx of allLedgerTxs) {
                if (tx.previousHash !== expectedPreviousHash) {
                    isLedgerBroken = true;
                    brokenTxId = tx.id;
                    this.logger.error(`\n GÃY CHUỖI HASH TẠI GIAO DỊCH: ${tx.id}`);
                    break;
                }

                // Tái tạo lại payload hệt như lúc lưu (Bắt buộc dùng accountCode)
                const entries = tx.lines.map(l => ({
                    accountCode: l.account.code,
                    isDebit: l.isDebit,
                    amount: Number(l.amount)
                }));
                const sortedEntries = entries.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

                const payload = JSON.stringify({
                    referenceType: tx.referenceType,
                    referenceId: tx.referenceId,
                    description: tx.description,
                    entries: sortedEntries
                });

                // Tính toán lại mã Hash từ dữ liệu hiện tại trong DB
                const recalculatedHash = this.generateHash(payload, tx.previousHash);

                if (recalculatedHash !== tx.currentHash) {
                    isLedgerBroken = true;
                    brokenTxId = tx.id;
                    this.logger.error(`\n DỮ LIỆU SỔ CÁI BỊ CHỈNH SỬA TRÁI PHÉP TẠI GIAO DỊCH: ${tx.id}`);
                    break;
                }

                expectedPreviousHash = tx.currentHash;
            }

            if (isLedgerBroken) {
                this.logger.error(`SỔ CÁI BỊ TẤN CÔNG (ID: ${brokenTxId})!`);

                await this.auditLogService.log({
                    actorId: 'SYSTEM',
                    actorEmail: null,
                    actorRole: 'CRON_JOB',
                    action: 'LEDGER_HASH_CHECK_FAILED',
                    entity: 'LEDGER_TRANSACTION',
                    entityId: brokenTxId,
                    before: null,
                    after: null,
                    metadata: {
                        brokenTxId,
                        reason: 'LEDGER_HASH_CHAIN_BROKEN',
                    },
                    ipAddress: null,
                    userAgent: 'RECONCILIATION_CRON',
                    status: AuditLogStatus.FAILED,
                    severity: AuditLogSeverity.CRITICAL,
                });

                await this.notificationService.notifyUsersByRole(
                    ['SUPER_ADMIN', 'ADMIN', 'AUDITOR'],
                    '[KHẨN CẤP] SỔ CÁI BỊ TẤN CÔNG',
                    `Hệ thống phát hiện chuỗi Hash của sổ cái bị gãy tại ID: ${brokenTxId}. Dữ liệu Database đã bị can thiệp trái phép trực tiếp. Toàn bộ tiến trình tự động đã bị phong tỏa!`,
                    NotificationType.URGENT,
                    '/admin/ledger',
                    true
                );

                return;
            }

            // Đối soát chiến dich
            // Lấy tất cả chiến dịch đang Active
            const campaigns = await this.campaignRepository.find({
                where: { status: CampaignStatus.ACTIVE }
            });

            for (const campaign of campaigns) {
                // Nguồn 1: Ledger
                const fundAccount = await this.accountRepository.findOne({
                    where: { code: `CAMP_${campaign.id}_FUND` }
                });

                const ledgerFundBalance = Number(fundAccount?.balance || 0);

                const displayTotalRaised = Number(campaign.currentAmount);

                // 3. Dữ liệu từ Chứng từ gốc (Database gốc)
                const { totalIn } = await this.donationRepository
                    .createQueryBuilder('donation')
                    .select('SUM(donation.amount)', 'totalIn')
                    .where('donation.campaign_id = :id AND donation.status = :status', {
                        id: campaign.id,
                        status: 'SUCCESS',
                    })
                    .getRawOne();

                const actualTotalDonations = Number(totalIn || 0);

                const { totalOut } = await this.disbursementRepository
                    .createQueryBuilder('disbursement')
                    .select('SUM(disbursement.amount)', 'totalOut')
                    .where('disbursement.campaign_id = :id AND disbursement.status = :status', {
                        id: campaign.id,
                        status: 'TRANSFERRED',
                    })
                    .getRawOne();

                const actualTotalDisbursements = Number(totalOut || 0);

                const expectedFundBalance = actualTotalDonations - actualTotalDisbursements;

                let isTampered = false;
                let alertMessage = '';

                if (Math.abs(actualTotalDonations - displayTotalRaised) > 0.01) {
                    isTampered = true;
                    alertMessage += `\n Lệch tổng quyên góp: Donations (${actualTotalDonations}) vs Campaign.currentAmount (${displayTotalRaised})`;
                }

                if (Math.abs(ledgerFundBalance - expectedFundBalance) > 0.01) {
                    isTampered = true;
                    alertMessage += `\n Lệch số dư quỹ: Ledger FUND (${ledgerFundBalance}) vs Donations - Disbursements (${expectedFundBalance})`;
                }

                if (isTampered) {
                    const before = {
                        status: campaign.status,
                    };

                    campaign.status = CampaignStatus.SUSPENDED;
                    const savedCampaign = await this.campaignRepository.save(campaign);

                    await this.auditLogService.log({
                        actorId: 'SYSTEM',
                        actorEmail: null,
                        actorRole: 'CRON_JOB',
                        action: 'RECONCILIATION_FAILED',
                        entity: 'CAMPAIGN',
                        entityId: savedCampaign.id,
                        before,
                        after: {
                            status: savedCampaign.status,
                        },
                        metadata: {
                            campaignTitle: savedCampaign.title,
                            ledgerFundBalance,
                            actualTotalDonations,
                            actualTotalDisbursements,
                            expectedFundBalance,
                            displayTotalRaised,
                            alertMessage,
                        },
                        ipAddress: null,
                        userAgent: 'RECONCILIATION_CRON',
                        status: AuditLogStatus.FAILED,
                        severity: AuditLogSeverity.CRITICAL,
                    });

                    await this.notificationService.notifyUsersByRole(
                        ['SUPER_ADMIN', 'AUDITOR'],
                        'PHÁT HIỆN RÒ RỈ QUỸ',
                        `Phát hiện sai lệch số dư tại chiến dịch "${campaign.title}". Hệ thống đã tự động khóa chiến dịch để bảo vệ tài sản. Chi tiết: ${alertMessage}`,
                        NotificationType.URGENT,
                        `/admin/campaigns/${campaign.id}`,
                        true
                    );
                }
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