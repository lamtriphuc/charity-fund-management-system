import { BadRequestException, Injectable, InternalServerErrorException } from "@nestjs/common";
import * as crypto from 'crypto';
import { EntityManager } from "typeorm";
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
}