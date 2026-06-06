import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { Disbursement } from '../disbursements/entities/disbursement.entity';
import { Donation } from '../donations/entities/donation.entity';
import { DisbursementStatus } from '../disbursements/dto/disbursement.dto';
import { CampaignStatus } from '../campaigns/dto/campaign.dto';
import * as ExcelJS from 'exceljs';
import { LedgerLine } from '../ledger/entities/ledger-line.entity';

@Injectable()
export class AnalyticService {
    constructor(
        @InjectRepository(Campaign) private campaignRepository: Repository<Campaign>,
        @InjectRepository(Disbursement) private disbursementRepository: Repository<Disbursement>,
        @InjectRepository(Donation) private donationRepository: Repository<Donation>,
        @InjectRepository(LedgerLine) private ledgerLineRepository: Repository<LedgerLine>,
    ) { }

    async getDashboardStats() {
        // 1. Tổng quỹ hệ thống (Cộng tổng currentAmount của tất cả chiến dịch)
        const totalFundResult = await this.campaignRepository
            .createQueryBuilder('campaign')
            .select('SUM(campaign.currentAmount)', 'total')
            .getRawOne();
        const totalFund = Number(totalFundResult?.total || 0);

        // 2. Đếm số yêu cầu giải ngân đang chờ duyệt
        const pendingDisbursementsCount = await this.disbursementRepository.count({
            where: { status: DisbursementStatus.PENDING_APPROVAL }
        });

        // 3. Đếm số chiến dịch đang Active
        const activeCampaignsCount = await this.campaignRepository.count({
            where: { status: CampaignStatus.ACTIVE }
        });

        const totalDonationsCount = await this.donationRepository.count();

        const recentDisbursements = await this.disbursementRepository.find({
            where: { status: DisbursementStatus.PENDING_APPROVAL },
            relations: ['campaign'], // Join để lấy tên chiến dịch
            order: { createdAt: 'DESC' },
            take: 5 // Chỉ lấy 5 dòng mới nhất
        });

        return {
            stats: {
                totalFund,
                pendingDisbursementsCount,
                activeCampaignsCount,
                totalDonationsCount
            },
            recentDisbursements: recentDisbursements.map(d => ({
                id: d.id,
                campaignTitle: d.campaign?.title || 'N/A',
                amount: Number(d.amount),
                requestDate: d.createdAt,
                status: d.status
            }))
        };
    }

    async exportDisbursementReport(): Promise<Buffer> {
        // 1. Lấy dữ liệu (Chỉ lấy các khoản đã chuyển tiền để kiểm toán)
        const disbursements = await this.disbursementRepository.find({
            where: { status: DisbursementStatus.TRANSFERRED },
            relations: ['campaign', 'volunteer']
        });

        // 2. Khởi tạo Workbook và Worksheet
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Báo Cáo Giải Ngân');

        // 3. Định nghĩa các cột
        worksheet.columns = [
            { header: 'Mã Giao Dịch (TxRef)', key: 'txReference', width: 25 },
            { header: 'Tên Chiến Dịch', key: 'campaignTitle', width: 40 },
            { header: 'Người Nhận (TNV)', key: 'volunteerName', width: 30 },
            { header: 'Số Tiền (VNĐ)', key: 'amount', width: 20 },
            { header: 'Ngày Giải Ngân', key: 'date', width: 20 },
        ];

        // Style cho dòng Header (In đậm, nền xám)
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3F4F6' } };

        // 4. Đổ dữ liệu vào các dòng
        disbursements.forEach(d => {
            worksheet.addRow({
                txReference: d.txReference || 'N/A',
                campaignTitle: d.campaign?.title || 'N/A',
                volunteerName: d.volunteer?.fullName || 'N/A',
                amount: Number(d.amount),
                date: new Date(d.createdAt).toLocaleDateString('vi-VN')
            });
        });

        // Format cột tiền tệ
        worksheet.getColumn('amount').numFmt = '#,##0';

        // 5. Xuất ra Buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }

    async exportCampaignStatement(campaignId: string): Promise<Buffer> {
        // 1. Kiểm tra chiến dịch
        const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
        if (!campaign) throw new NotFoundException('Không tìm thấy chiến dịch');

        // 2. Truy vấn dữ liệu Sổ cái (Làm phẳng)
        const lines = await this.ledgerLineRepository.find({
            where: [
                { account: { code: `CAMP_${campaignId}_REV` } }, // Tiền vào
                { account: { code: `CAMP_${campaignId}_EXP` } }  // Tiền ra
            ],
            relations: ['ledgerTransaction', 'account'],
            order: {
                ledgerTransaction: {
                    createdAt: 'ASC'
                }
            }
        });

        // 3. Khởi tạo Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(`Sao_ke_${campaignId.substring(0, 6)}`);

        // 4. Định nghĩa các cột
        worksheet.columns = [
            { header: 'Thời Gian', key: 'date' },
            { header: 'Mã Giao Dịch Sổ Cái', key: 'txId' },
            { header: 'Loại Phát Sinh', key: 'type' },
            { header: 'Diễn Giải', key: 'description' },
            { header: 'Số Tiền (VNĐ)', key: 'amount' },
            { header: 'Mã Băm (Hash) Giao Dịch', key: 'hash' }
        ];

        // 5. Đổ dữ liệu và Đổ màu xen kẽ (Zebra Striping)
        lines.forEach((line, index) => {
            const isRevenue = line.account.code.endsWith('_REV');
            // Nếu là dòng doanh thu và ghi Có (Credit) -> Tiền vào (+)
            // Nếu là dòng chi phí và ghi Nợ (Debit) -> Tiền ra (-)
            const actualAmount = isRevenue ? Number(line.amount) : -Number(line.amount);

            const row = worksheet.addRow({
                date: new Date(line.ledgerTransaction.createdAt).toLocaleString('vi-VN'),
                txId: line.ledgerTransaction.id,
                type: isRevenue ? 'Quyên Góp' : 'Giải Ngân',
                description: line.ledgerTransaction.description,
                amount: actualAmount,
                hash: line.ledgerTransaction.currentHash
            });

            // Đổ màu xen kẽ chẵn/lẻ
            if (index % 2 === 0) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F9FAFB' } };
            }
        });

        // 6. Định dạng Header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4F46E5' } }; // Xanh Indigo

        // 7. Định dạng Cột tiền tệ
        worksheet.getColumn('amount').numFmt = '#,##0 "VND"';

        // 8. Tự động căn chỉnh độ rộng cột (Auto-fit Width)
        worksheet.columns.forEach(column => {
            let maxLength = 0;
            column?.eachCell?.({ includeEmpty: true }, cell => {
                const columnLength = cell.value ? cell.value.toString().length : 10;
                if (columnLength > maxLength) maxLength = columnLength;
            });
            column.width = maxLength < 15 ? 15 : maxLength + 2; // Khoảng đệm
        });

        // 9. Tiêm công thức Toán học (Formula Injection)
        const lastRowIndex = lines.length + 2; // +1 cho header, +1 cho dòng tổng
        const totalRow = worksheet.getRow(lastRowIndex);
        totalRow.getCell('description').value = 'TỔNG SỐ DƯ HIỆN TẠI:';
        totalRow.getCell('description').font = { bold: true };
        totalRow.getCell('amount').value = { formula: `SUM(E2:E${lastRowIndex - 1})` }; // Hàm SUM trỏ vào cột E
        totalRow.getCell('amount').font = { bold: true, color: { argb: '059669' } }; // Chữ xanh lá

        // 10. Xuất Buffer
        const buffer = await workbook.xlsx.writeBuffer();
        return Buffer.from(buffer);
    }
}