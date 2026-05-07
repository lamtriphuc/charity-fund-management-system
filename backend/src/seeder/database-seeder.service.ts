import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { User } from '../modules/users/entities/user.entity';
import { Role } from '../modules/users/entities/role.entity';
import { Account } from '../modules/ledger/entities/account.entity';
import { Campaign } from '../modules/campaigns/entities/campaign.entity';

import { AccountType, LedgerReferenceType } from '../modules/ledger/dto/ledger.dto';
import { CampaignStatus, CampaignType } from '../modules/campaigns/dto/campaign.dto';
import { UserKycStatus } from 'src/modules/users/dto/user.dto';
import { Donation } from 'src/modules/donations/entities/donation.entity';
import { DonationStatus } from 'src/modules/donations/dto/donation.dto';
import { Disbursement } from 'src/modules/disbursements/entities/disbursement.entity';
import { DisbursementStatus } from 'src/modules/disbursements/dto/disbursement.dto';
import { LedgerTransaction } from 'src/modules/ledger/entities/ledger-transaction.entity';
import { LedgerLine } from 'src/modules/ledger/entities/ledger-line.entity';

@Injectable()
export class DatabaseSeederService {
    private readonly logger = new Logger(DatabaseSeederService.name);

    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        private readonly dataSource: DataSource
    ) { }

    async seed() {
        const count = await this.campaignRepository.count();
        if (count > 0) {
            this.logger.log('Dữ liệu đã tồn tại, bỏ qua quá trình Seeding để bảo vệ Sổ cái.');
            return;
        }

        this.logger.log('--- BẮT ĐẦU QUÁ TRÌNH SEEDING DỮ LIỆU CỐ ĐỊNH & SỔ CÁI ---');

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { admin, volunteer, donor } = await this.seedRolesAndUsers(queryRunner.manager);
            const cashAccount = await this.seedSystemAccount(queryRunner.manager);

            await this.seedCampaignsAndTransactions(queryRunner.manager, cashAccount, admin, volunteer, donor);

            await queryRunner.commitTransaction();
            this.logger.log('--- KẾT THÚC SEEDING: DỮ LIỆU KẾ TOÁN HOÀN HẢO ---');
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Seeding thất bại, đã Rollback toàn bộ!', error.stack);
        } finally {
            await queryRunner.release();
        }
    }

    private async seedRolesAndUsers(manager: EntityManager) {
        const roles = [
            manager.create(Role, { name: 'ADMIN', permissions: ['*'] }),
            manager.create(Role, { name: 'VOLUNTEER', permissions: ['manage_campaigns'] }),
            manager.create(Role, { name: 'DONOR', permissions: ['donate'] })
        ];
        await manager.save(roles);

        const hashedPassword = await bcrypt.hash('111111', 10);

        const admin = manager.create(User, {
            email: 'admin@gmail.com', hashedPassword, fullName: 'System Administrator',
            kycStatus: UserKycStatus.VERIFIED, role: roles[0],
        });
        const volunteer = manager.create(User, {
            email: 'volunteer1@gmail.com', hashedPassword, fullName: 'Trần Tình Nguyện',
            kycStatus: UserKycStatus.VERIFIED, role: roles[1],
        });
        const donor = manager.create(User, {
            email: 'donor1@gmail.com', hashedPassword, fullName: 'Nguyễn Nhà Hảo Tâm',
            kycStatus: UserKycStatus.NONE, role: roles[2],
        });

        await manager.save([admin, volunteer, donor]);
        return { admin, volunteer, donor };
    }

    private async seedSystemAccount(manager: EntityManager) {
        const cashAccount = manager.create(Account, {
            code: 'SYS_CASH',
            accountType: AccountType.ASSET,
            name: 'Tiền Gửi Ngân Hàng Tổng',
            balance: 0,
        });
        return await manager.save(cashAccount);
    }

    private async seedCampaignsAndTransactions(
        manager: EntityManager, cashAccount: Account,
        admin: User, volunteer: User, donor: User
    ) {
        let currentChainHash = 'GENESIS_HASH_0000000000000000';
        this.logger.log('Đang khởi tạo 40 chiến dịch và móc xích Blockchain Sổ cái. Vui lòng đợi...');

        const templates = [
            // Y TẾ (10)
            { title: 'Phẫu thuật tim bẩm sinh cho bé An', cat: 'Y tế', target: 80000000 },
            { title: 'Chuyến xe Hy Vọng - Hỗ trợ bệnh nhi ung thư', cat: 'Y tế', target: 150000000 },
            { title: 'Nụ cười cho em - Phẫu thuật hở hàm ếch', cat: 'Y tế', target: 50000000 },
            { title: 'Cấp cứu bệnh nhân suy thận xóm chạy thận', cat: 'Y tế', target: 120000000 },
            { title: 'Mang ánh sáng cho người già neo đơn', cat: 'Y tế', target: 60000000 },
            { title: 'Hỗ trợ xe lăn cho người khuyết tật nghèo', cat: 'Y tế', target: 45000000 },
            { title: 'Mua máy thở cho bệnh viện tuyến huyện', cat: 'Y tế', target: 300000000 },
            { title: 'Quỹ thuốc men cho bệnh nhi vùng cao', cat: 'Y tế', target: 75000000 },
            { title: 'Cứu sống mẹ bầu bị tiền sản giật', cat: 'Y tế', target: 50000000 },
            { title: 'Chi phí ghép tủy cho kỹ sư trẻ', cat: 'Y tế', target: 800000000 },

            // GIÁO DỤC (10)
            { title: 'Xây trường mầm non bản Nậm Pồ', cat: 'Giáo dục', target: 500000000 },
            { title: 'Thư viện ước mơ cho học sinh vùng sâu', cat: 'Giáo dục', target: 120000000 },
            { title: 'Áo ấm cho em tới trường', cat: 'Giáo dục', target: 80000000 },
            { title: 'Học bổng sinh viên nghèo vượt khó', cat: 'Giáo dục', target: 200000000 },
            { title: 'Tặng xe đạp cho học sinh ngoại ô', cat: 'Giáo dục', target: 40000000 },
            { title: 'Phòng máy tính cho trường THCS nghèo', cat: 'Giáo dục', target: 150000000 },
            { title: 'Bữa ăn trưa có thịt cho trẻ em miền núi', cat: 'Giáo dục', target: 300000000 },
            { title: 'Sách giáo khoa mới cho năm học mới', cat: 'Giáo dục', target: 50000000 },
            { title: 'Xây nhà bán trú cho học sinh Lai Châu', cat: 'Giáo dục', target: 450000000 },
            { title: 'Đèn năng lượng mặt trời để học bài đêm', cat: 'Giáo dục', target: 60000000 },

            // KHẨN CẤP (10)
            { title: 'Cứu trợ khẩn cấp lũ lụt miền Trung', cat: 'Khẩn cấp', target: 2000000000 },
            { title: 'Hỗ trợ đồng bào bị sạt lở đất', cat: 'Khẩn cấp', target: 800000000 },
            { title: 'Giúp đỡ gia đình nạn nhân vụ hỏa hoạn', cat: 'Khẩn cấp', target: 150000000 },
            { title: 'Cung cấp nước sạch vùng hạn mặn Miền Tây', cat: 'Khẩn cấp', target: 350000000 },
            { title: 'Khắc phục hậu quả sau bão số 3', cat: 'Khẩn cấp', target: 1500000000 },
            { title: 'Hỗ trợ nông dân mất trắng do dông lốc', cat: 'Khẩn cấp', target: 200000000 },
            { title: 'Chuyến hàng y tế khẩn cấp', cat: 'Khẩn cấp', target: 100000000 },
            { title: 'Cứu đói các bản làng bị cô lập', cat: 'Khẩn cấp', target: 250000000 },
            { title: 'Hỗ trợ thuyền viên gặp nạn trên biển', cat: 'Khẩn cấp', target: 150000000 },
            { title: 'Cứu trợ sập cầu sập hầm lò', cat: 'Khẩn cấp', target: 500000000 },

            // CỘNG ĐỒNG & MÔI TRƯỜNG (10)
            { title: 'Xây cầu dân sinh xóa cầu khỉ', cat: 'Cộng đồng', target: 300000000 },
            { title: 'Mái ấm tình thương cho cụ bà neo đơn', cat: 'Cộng đồng', target: 80000000 },
            { title: 'Khoan giếng nước sạch cho buôn làng', cat: 'Cộng đồng', target: 45000000 },
            { title: 'Chuyến xe 0 đồng đưa công nhân về quê', cat: 'Cộng đồng', target: 150000000 },
            { title: 'Bếp ăn từ thiện tại Bệnh viện K', cat: 'Cộng đồng', target: 200000000 },
            { title: 'Dự án trồng 10,000 cây xanh chắn sóng', cat: 'Môi trường', target: 150000000 },
            { title: 'Dọn sạch rác bãi biển Nam Định', cat: 'Môi trường', target: 30000000 },
            { title: 'Bảo tồn rùa biển Côn Đảo', cat: 'Môi trường', target: 80000000 },
            { title: 'Lắp thùng rác công cộng vùng nông thôn', cat: 'Môi trường', target: 40000000 },
            { title: 'Tuyên truyền tái chế rác thải nhựa', cat: 'Môi trường', target: 25000000 },
        ];

        // Lặp tạo 40 chiến dịch
        for (let i = 0; i < templates.length; i++) {
            const template = templates[i];

            // 1. Tạo Account Quỹ trước
            const campAccount = manager.create(Account, {
                code: `CAMP_100${i}`, accountType: AccountType.LIABILITY,
                name: `Quỹ: ${template.title}`, balance: 0
            });
            await manager.save(campAccount);

            // 2. Tạo Chiến dịch
            const campaign = manager.create(Campaign, {
                title: template.title,
                description: `Đây là chiến dịch thuộc lĩnh vực ${template.cat}. Rất mong nhận được sự quan tâm và ủng hộ từ các nhà hảo tâm.`,
                category: template.cat,
                targetAmount: template.target,
                currentAmount: 0,
                status: CampaignStatus.ACTIVE,
                campaignType: CampaignType.FLEXIBLE,
                fundAccountId: campAccount.id,
                createdBy: volunteer, approvedBy: admin,
                startDate: new Date(),
                endDate: new Date(Date.now() + 30 * 86400000)
            });
            await manager.save(campaign);

            // 3. TẠO LUỒNG GIAO DỊCH (Donate & Disbursement)
            // Lấy 1 mức donate ngẫu nhiên dựa trên Target để số liệu trông có thật
            const part1 = Math.floor(template.target * 0.15); // Donate 15%
            const part2 = Math.floor(template.target * 0.35); // Donate 35%
            const disb1 = Math.floor(template.target * 0.20); // Giải ngân 20%

            // Giao dịch 1: Quyên góp đợt 1
            currentChainHash = await this.simulateDonation(manager, cashAccount, campAccount, campaign, donor, part1, currentChainHash);

            // Giao dịch 2: Quyên góp đợt 2
            currentChainHash = await this.simulateDonation(manager, cashAccount, campAccount, campaign, donor, part2, currentChainHash);

            // Giao dịch 3: Giải ngân đợt 1 (Áp dụng cho các chiến dịch chẵn để tạo sự đa dạng)
            if (i % 2 === 0) {
                currentChainHash = await this.simulateDisbursement(manager, cashAccount, campAccount, campaign, volunteer, disb1, currentChainHash);
            }
        }
    }

    // =====================================================================
    // HÀM MÔ PHỎNG LUỒNG KẾ TOÁN (TẠO HASH CHUẨN XÁC)
    // =====================================================================

    private async simulateDonation(
        manager: EntityManager, cashAccount: Account, fundAccount: Account,
        campaign: Campaign, donor: User, amount: number, previousHash: string
    ): Promise<string> {
        const donation = manager.create(Donation, {
            campaign, donor, amount, status: DonationStatus.SUCCESS,
            txReference: `DONATE_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        });
        await manager.save(donation);

        const entries = [
            { accountId: cashAccount.id, isDebit: true, amount },
            { accountId: fundAccount.id, isDebit: false, amount }
        ];

        const newHash = await this.recordLedgerTransaction(manager, LedgerReferenceType.DONATION, donation.id, entries, previousHash);

        cashAccount.balance = Number(cashAccount.balance) + amount;
        fundAccount.balance = Number(fundAccount.balance) + amount;
        campaign.currentAmount = Number(campaign.currentAmount) + amount;

        await manager.save([cashAccount, fundAccount, campaign]);
        return newHash;
    }

    private async simulateDisbursement(
        manager: EntityManager, cashAccount: Account, fundAccount: Account,
        campaign: Campaign, volunteer: User, amount: number, previousHash: string
    ): Promise<string> {
        const disbursement = manager.create(Disbursement, {
            campaign, volunteer, amount, status: DisbursementStatus.TRANSFERRED,
            purpose: 'Chi phí tạm ứng hoạt động từ thiện',
            txReference: `DISB_${Date.now()}_${Math.floor(Math.random() * 1000)}`
        });
        await manager.save(disbursement);

        const entries = [
            { accountId: fundAccount.id, isDebit: true, amount },
            { accountId: cashAccount.id, isDebit: false, amount }
        ];

        const newHash = await this.recordLedgerTransaction(manager, LedgerReferenceType.DISBURSEMENT, disbursement.id, entries, previousHash);

        cashAccount.balance = Number(cashAccount.balance) - amount;
        fundAccount.balance = Number(fundAccount.balance) - amount;
        campaign.currentAmount = Number(campaign.currentAmount) - amount;

        await manager.save([cashAccount, fundAccount, campaign]);
        return newHash;
    }

    private async recordLedgerTransaction(
        manager: EntityManager, refType: LedgerReferenceType, refId: string,
        entries: any[], previousHash: string
    ): Promise<string> {

        const sortedEntries = entries.sort((a, b) => a.accountId.localeCompare(b.accountId));
        const payload = JSON.stringify({ referenceType: refType, referenceId: refId, entries: sortedEntries });

        const dataToHash = `${payload}|${previousHash}`;
        const currentHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

        const ledgerTx = manager.create(LedgerTransaction, {
            referenceType: refType, referenceId: refId,
            previousHash, currentHash
        });
        await manager.save(ledgerTx);

        for (const entry of sortedEntries) {
            const line = manager.create(LedgerLine, {
                ledgerTransaction: ledgerTx,
                account: { id: entry.accountId },
                isDebit: entry.isDebit,
                amount: entry.amount
            });
            await manager.save(line);
        }

        return currentHash;
    }
}