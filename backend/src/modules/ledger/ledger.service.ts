import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import * as crypto from 'crypto';
import { DataSource, EntityManager, QueryRunner } from "typeorm";
import { LedgerTransaction } from "./entities/ledger-transaction.entity";
import { stringify } from "querystring";
import { LedgerLine } from "./entities/ledger-line.entity";
import { Account } from "./entities/account.entity";

export interface JournalEntry {
    accountId: string;
    isDebit: boolean;
    amount: number;
}

@Injectable()
export class LedgerService {
    constructor(private readonly dataSource: DataSource) { }

    private generateHash(payload: any, previousHash: string): string {
        const data = `${payload}|${previousHash}`;
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    async recordTransaction(
        manager: EntityManager,
        referenceType: string,
        referenceId: string,
        entries: JournalEntry[]
    ) {
        // Kế toán kép: Tổng Nợ = Tổng Có
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

        // lấy mà Hash của GD cuối cùng trong sổ cái
        const [lastTransaction] = await manager.find(LedgerTransaction, {
            order: { createdAt: 'DESC' },
            take: 1,
        });

        const previousHash = lastTransaction?.currentHash || 'GENESIS_HASH_0000000000000000';

        // 3. TẠO PAYLOAD ĐỂ BĂM (Hash)
        // Sắp xếp entries để đảm bảo chuỗi JSON luôn nhất quán dù thứ tự mảng thay đổi
        const sortedEntries = [...entries].sort((a, b) => a.accountId.localeCompare(b.accountId));
        const payload = JSON.stringify({ referenceType, referenceId, entries: sortedEntries });
        const currentHash = this.generateHash(payload, previousHash);

        // 4. LƯU GIAO DỊCH SỔ CÁI (Ledger Transaction)
        const ledgerTx = manager.create(LedgerTransaction, {
            referenceType,
            referenceId,
            previousHash,
            currentHash,
        });
        await manager.save(ledgerTx);

        // 5. LƯU CÁC BÚT TOÁN CHI TIẾT (Ledger Lines) & CẬP NHẬT SỐ DƯ TÀI KHOẢN
        for (const entry of entries) {
            // Lưu Line
            const line = manager.create(LedgerLine, {
                ledgerTransaction: ledgerTx,
                account: { id: entry.accountId },
                isDebit: entry.isDebit,
                amount: entry.amount,
            });
            await manager.save(line);

            // Cập nhật số dư Account (Sử dụng Lock chống ghi đè đồng thời)
            const account = await manager.findOne(Account, {
                where: { id: entry.accountId },
                lock: { mode: 'pessimistic_write' }, // Khoá dòng này lại cho đến khi Transaction kết thúc
            });

            if (!account) throw new InternalServerErrorException(`Không tìm thấy Tài khoản: ${entry.accountId}`);

            // Logic cộng trừ tùy theo loại tài khoản (ASSET vs LIABILITY)
            if (account.accountType === 'ASSET' || account.accountType === 'EXPENSE') {
                account.balance = Number(account.balance) + (entry.isDebit ? entry.amount : -entry.amount);
            } else if (account.accountType === 'LIABILITY' || account.accountType === 'REVENUE') {
                account.balance = Number(account.balance) + (entry.isDebit ? -entry.amount : entry.amount);
            }

            // Không cho phép tài khoản Quỹ bị âm (Overdraft)
            if (account.balance < 0) {
                throw new BadRequestException(`Giao dịch thất bại: Tài khoản ${account.name} không đủ số dư.`);
            }

            await manager.save(account);
        }

        return ledgerTx;
    }

    async refundDonation(
        donationId: string,
        campaignFundAccountId: string,
        amount: number,
        txReference: string
    ) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Tìm tài khoản
            const cashAccount = await queryRunner.manager.findOne(Account, { where: { code: 'SYS_CASH' } });
            const fundAccount = await queryRunner.manager.findOne(Account, { where: { id: campaignFundAccountId } });

            if (!cashAccount || !fundAccount) throw new Error('Không tìm thấy tài khoản kế toán.');
            if (Number(fundAccount.balance) < amount) throw new Error('Quỹ chiến dịch không đủ để hoàn tiền.');

            // 2. Tạo Transaction mới cho việc Hoàn tiền
            const transaction = queryRunner.manager.create(LedgerTransaction, {
                referenceType: 'REFUND',
                referenceId: donationId,
                description: `Hoàn tiền tự động cho giao dịch ${txReference}`,
            });
            await queryRunner.manager.save(transaction);

            // 3. Bút toán ngược: NỢ Quỹ (Giảm quỹ) - CÓ Ngân hàng (Giảm tiền thật)
            const debitLine = queryRunner.manager.create(LedgerLine, {
                ledgerTransaction: transaction,
                account: fundAccount,
                isDebit: true, // Ghi Nợ -> Giảm quỹ nợ phải trả
                amount: amount,
            });

            const creditLine = queryRunner.manager.create(LedgerLine, {
                ledgerTransaction: transaction,
                account: cashAccount,
                isDebit: false, // Ghi Có -> Giảm tài sản
                amount: amount,
            });

            await queryRunner.manager.save([debitLine, creditLine]);

            // 4. Cập nhật số dư Sổ cái
            fundAccount.balance = Number(fundAccount.balance) - amount;
            cashAccount.balance = Number(cashAccount.balance) - amount;
            await queryRunner.manager.save([fundAccount, cashAccount]);

            // 5. Cập nhật Blockchain Hash (Giả định bạn đã có logic tạo Hash)
            const payload = JSON.stringify({ referenceType: 'REFUND', referenceId: donationId, amount });
            await this.appendBlockchainHash(queryRunner, transaction, payload);

            await queryRunner.commitTransaction();
            return transaction;
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    private async appendBlockchainHash(
        queryRunner: QueryRunner,
        transaction: LedgerTransaction,
        payload: string,
    ) {
        // 1. Tìm giao dịch gần nhất để lấy previousHash
        const lastTx = await queryRunner.manager.findOne(LedgerTransaction, {
            where: {},
            order: { createdAt: 'DESC' },
        });

        const previousHash = lastTx && lastTx.currentHash
            ? lastTx.currentHash
            : 'GENESIS_HASH_0000000000000000';

        // 2. Sinh ra mã Hash mới cho giao dịch hiện tại
        const dataToHash = `${payload}|${previousHash}`;
        const currentHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

        // 3. Cập nhật vào bản ghi Transaction
        transaction.previousHash = previousHash;
        transaction.currentHash = currentHash;

        // 4. Lưu lại sự thay đổi này vào Database
        await queryRunner.manager.save(transaction);
    }
}