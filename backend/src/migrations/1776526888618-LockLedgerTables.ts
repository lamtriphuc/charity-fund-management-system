import { MigrationInterface, QueryRunner } from "typeorm";

export class LockLedgerTables1776526888618 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Tạo một Hàm cấm sửa/xóa dưới db
        await queryRunner.query(`
            CREATE OR REPLACE FUNCTION prevent_modify_delete()
            RETURNS TRIGGER AS $$
            BEGIN
                RAISE EXCEPTION 'CẢNH BÁO BẢO MẬT: Bảng này được khóa cứng ở chế độ Append-Only. Hành động Sửa/Xóa bị nghiêm cấm!';
            END;
            $$ LANGUAGE plpgsql;
        `);

        // 2. Gắn hàm này vào Trigger cho các bảng tài chính cốt lõi
        const tablesToLock = ['ledger_transactions', 'ledger_lines', 'donations', 'disbursements'];

        for (const table of tablesToLock) {
            await queryRunner.query(`
                CREATE TRIGGER trigger_lock_${table}
                BEFORE UPDATE OR DELETE ON "${table}"
                FOR EACH ROW 
                EXECUTE FUNCTION prevent_modify_delete();
            `);
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Hàm dùng để rollback (gỡ khóa) nếu cần thiết
        const tablesToLock = ['ledger_transactions', 'ledger_lines', 'donations', 'disbursements'];

        for (const table of tablesToLock) {
            await queryRunner.query(`DROP TRIGGER IF EXISTS trigger_lock_${table} ON "${table}";`);
        }
        await queryRunner.query(`DROP FUNCTION IF EXISTS prevent_modify_delete();`);
    }

}
