import { BadRequestException, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import * as crypto from 'crypto';
import { DataSource, EntityManager, QueryRunner, Repository } from "typeorm";
import { LedgerTransaction } from "./entities/ledger-transaction.entity";
import { stringify } from "querystring";
import { LedgerLine } from "./entities/ledger-line.entity";
import { Account } from "./entities/account.entity";
import { AccountType, LedgerReferenceType } from "./dto/ledger.dto";
import { InjectRepository } from "@nestjs/typeorm";

export interface JournalEntry {
    accountCode: string;
    isDebit: boolean;
    amount: number;
}

@Injectable()
export class LedgerService {
    private readonly logger = new Logger(LedgerService.name);

    constructor(
        private readonly dataSource: DataSource,
        @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
        @InjectRepository(LedgerLine) private readonly ledgerLineRepository: Repository<LedgerLine>
    ) { }

    async getSystemBalances() {
        const cashAccount = await this.accountRepository.findOne({
            where: { code: 'SYS_BANK_MAIN' }
        });
        const totalCash = Number(cashAccount?.balance || 0);

        // Tổng nghĩa vụ = tất cả LIA (campaign + general fund)
        const { totalLiability } = await this.accountRepository
            .createQueryBuilder('account')
            .select('SUM(account.balance)', 'totalLiability')
            .where("account.code LIKE 'CAMP_%_FUND' OR account.code = 'SYS_GENERAL_FUND'")
            .getRawOne();

        const liabilities = Number(totalLiability || 0);

        return {
            totalCash,
            totalLiability: liabilities,
            surplus: totalCash - liabilities // Luôn = 0 nếu hệ thống đúng
        };
    }

    /**
     * LẤY DANH SÁCH BÚT TOÁN (Có phân trang và tìm kiếm)
     */
    async getLedgerLines(page: number = 1, limit: number = 20, keyword?: string) {
        const skip = (page - 1) * limit;

        const qb = this.ledgerLineRepository.createQueryBuilder('line')
            .leftJoinAndSelect('line.ledgerTransaction', 'tx')
            .leftJoinAndSelect('line.account', 'account')
            .orderBy('tx.createdAt', 'DESC')
            .addOrderBy('line.isDebit', 'DESC') // Xếp Nợ trước, Có sau cho cùng 1 giao dịch
            .skip(skip)
            .take(limit);

        if (keyword) {
            qb.andWhere(
                // SỬA LỖI Ở ĐÂY: Ép kiểu tx.referenceId sang TEXT
                '(CAST(tx.referenceId AS TEXT) ILIKE :keyword OR tx.description ILIKE :keyword OR account.name ILIKE :keyword)',
                { keyword: `%${keyword}%` }
            );
        }

        const [items, total] = await qb.getManyAndCount();

        // Map data để trả về định dạng phẳng (flat) dễ hiển thị lên bảng
        const mappedItems = items.map(line => ({
            id: line.id, // ID của dòng bút toán
            transactionId: line.ledgerTransaction.id,
            date: line.ledgerTransaction.createdAt,
            description: line.ledgerTransaction.description,
            reference: line.ledgerTransaction.referenceId,
            account: line.account.name,
            accountCode: line.account.code,
            debit: line.isDebit ? Number(line.amount) : 0,
            credit: !line.isDebit ? Number(line.amount) : 0,
        }));

        return {
            data: mappedItems,
            meta: {
                totalItems: total,
                currentPage: page,
                itemsPerPage: limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    /**
     * 2. NGHIỆP VỤ GIẢI NGÂN (DISBURSEMENT)
     * Kế toán kép: Nợ (Tăng Chi phí) / Có (Giảm Tài sản)
     */
    async recordDisbursement(
        manager: EntityManager,
        campaignId: string,
        amount: number,
        referenceId: string,
        description: string
    ) {
        const fundAccount = await manager.findOne(Account, {
            where: { code: `CAMP_${campaignId}_FUND` }
        });

        const availableFund = Number(fundAccount?.balance || 0);
        if (availableFund < amount) {
            throw new BadRequestException(`Quỹ chiến dịch không đủ. Có thể giải ngân tối đa: ${availableFund}`);
        }

        const entries: JournalEntry[] = [
            { accountCode: `CAMP_${campaignId}_FUND`, isDebit: true, amount }, // Nợ: Quỹ giảm
            { accountCode: 'SYS_BANK_MAIN', isDebit: false, amount }          // Có: Tài sản giảm
        ];

        await this.recordTransaction(manager, LedgerReferenceType.DISBURSEMENT, referenceId, description, entries);

        this.logger.log(`[DISBURSEMENT] Đã giải ngân ${amount} VND cho chiến dịch ${campaignId}`);
    }

    async recordTransaction(
        manager: EntityManager,
        referenceType: LedgerReferenceType,
        referenceId: string,
        description: string,
        entries: JournalEntry[]
    ) {
        if (!manager.queryRunner?.isTransactionActive) {
            return this.dataSource.transaction((transactionManager) =>
                this.recordTransaction(
                    transactionManager,
                    referenceType,
                    referenceId,
                    description,
                    entries
                )
            );
        }

        // 1. Kiểm tra nguyên tắc Kế toán kép
        let totalDebit = 0;
        let totalCredit = 0;

        for (const entry of entries) {
            if (entry.amount <= 0) throw new BadRequestException('Số tiền bút toán phải lớn hơn 0');
            if (entry.isDebit) totalDebit += entry.amount;
            else totalCredit += entry.amount;
        }

        if (totalDebit !== totalCredit) {
            throw new InternalServerErrorException(`Lỗi Kế toán kép: Tổng Nợ (${totalDebit}) khác Tổng Có (${totalCredit})`);
        }

        // 2. Tìm mã Hash của giao dịch liền kề trước đó
        const [lastTransaction] = await manager.find(LedgerTransaction, {
            order: { createdAt: 'DESC' },
            take: 1,
            lock: { mode: 'pessimistic_write' }
        });

        const previousHash = lastTransaction?.currentHash || 'GENESIS_HASH_0000000000000000';

        // 3. TẠO HASH CHO GIAO DỊCH HIỆN TẠI
        const sortedEntries = [...entries].sort((a, b) => a.accountCode.localeCompare(b.accountCode));
        const payload = JSON.stringify({ referenceType, referenceId, description, entries: sortedEntries });
        const currentHash = crypto.createHash('sha256').update(`${payload}|${previousHash}`).digest('hex');

        const ledgerTx = manager.create(LedgerTransaction, {
            referenceType,
            referenceId,
            description,
            previousHash,
            currentHash,
        });
        await manager.save(ledgerTx);

        // LƯU CHI TIẾT BÚT TOÁN
        for (const entry of sortedEntries) {
            const account = await manager.findOne(Account, {
                where: { code: entry.accountCode },
                lock: { mode: 'pessimistic_write' },
            });

            if (!account) throw new InternalServerErrorException(`Không tìm thấy Tài khoản: ${entry.accountCode}`);

            // Lưu Line
            const line = manager.create(LedgerLine, {
                ledgerTransaction: ledgerTx,
                account: account,
                isDebit: entry.isDebit,
                amount: entry.amount,
            });
            await manager.save(line);

            // ASSET: Nợ tăng, Có giảm
            // LIABILITY: Nợ giảm, Có tăng
            if (account.accountType === AccountType.ASSET) {
                account.balance = Number(account.balance) + (entry.isDebit ? entry.amount : -entry.amount);
            } else {
                account.balance = Number(account.balance) + (entry.isDebit ? -entry.amount : entry.amount);
            }

            if (account.balance < 0) {
                throw new BadRequestException(`Giao dịch bị từ chối: Tài khoản ${account.name} bị âm số dư.`);
            }

            await manager.save(account);
        }

        return ledgerTx;
    }
}