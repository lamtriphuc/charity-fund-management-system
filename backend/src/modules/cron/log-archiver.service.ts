import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CloudinaryService, CloudinaryFolder } from '../../common/cloudinary/cloudinary.service';
import { SearchService } from '../search/search.service';
import { ArchivedLog } from '../system/entities/archived-log.entity';

export interface IAuditLog {
    timestamp: string;
    actor_id: string;
    action: string;
    [key: string]: any; // Chấp nhận các trường khác
}

@Injectable()
export class LogArchiverService {
    private readonly logger = new Logger(LogArchiverService.name);

    constructor(
        private readonly searchService: SearchService,
        private readonly cloudinaryService: CloudinaryService,
        @InjectRepository(ArchivedLog) private archivedLogRepo: Repository<ArchivedLog>
    ) { }

    // Chạy lúc 00:00 ngày 1 hàng tháng
    @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
    async archiveExpiredLogs() {
        this.logger.log('Bắt đầu tiến trình đóng băng Audit Logs cũ...');

        try {
            // 1. Lấy mốc 3 tháng trước
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
            const cutoffDate = threeMonthsAgo.toISOString();

            // 2. Query Elasticsearch
            const oldLogs = await this.searchService.getLogsOlderThan(cutoffDate);

            if (!oldLogs || oldLogs.length === 0) {
                this.logger.log('Tháng này không có log nào quá hạn cần nén.');
                return;
            }

            // Tính toán khoảng thời gian của đống log này
            // Giả định log đã được sort theo timestamp tăng dần
            const fromDate = oldLogs[0].timestamp;
            const toDate = oldLogs[oldLogs.length - 1].timestamp;

            const fileName = `audit_logs_${new Date(fromDate).getTime()}_to_${new Date(toDate).getTime()}`;

            // 3. Ép kiểu JSON sang Buffer
            const jsonString = JSON.stringify(oldLogs, null, 2);
            const fileBuffer = Buffer.from(jsonString, 'utf-8');

            // 4. Upload thẳng lên Cloudinary
            const uploadResult = await this.cloudinaryService.uploadRawBuffer(
                fileBuffer,
                fileName,
                CloudinaryFolder.AUDIT_ARCHIVES
            );

            // 5. Ghi vết vào PostgreSQL để Admin tải về sau
            const archivedRecord = this.archivedLogRepo.create({
                fileName: `${fileName}.json`,
                fileUrl: uploadResult.secure_url,
                recordCount: oldLogs.length,
                fromDate: new Date(fromDate),
                toDate: new Date(toDate)
            });
            await this.archivedLogRepo.save(archivedRecord);

            this.logger.log(`Đã nén ${oldLogs.length} bản ghi lên Cloudinary: ${uploadResult.secure_url}`);

            // 6. DỌN DẸP ELASTICSEARCH
            await this.searchService.deleteLogsOlderThan(cutoffDate);

            this.logger.log('Đã dọn sạch Elasticsearch. Quá trình Archive hoàn tất mượt mà!');

        } catch (error) {
            this.logger.error('Tiến trình Archive Logs thất bại:', error);
        }
    }
}