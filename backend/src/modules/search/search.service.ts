import { Injectable, Logger } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";

@Injectable()
export class SearchService {
    private readonly logger = new Logger(SearchService.name);

    constructor(private readonly esService: ElasticsearchService) { }

    async logAction(actionData: any) {
        try {
            const date = new Date();
            const indexName = `audit-logs-${date.getFullYear()}-${date.getMonth() + 1}`;

            await this.esService.index({
                index: indexName,
                document: {
                    ...actionData,
                    timestamp: new Date().toISOString()
                }
            });
        } catch (error) {
            this.logger.error(`Không thể đẩy log sang Elasticsearch: ${error.message}`);
        }
    }

    async searchAuditLogs(page: number = 1, limit: number = 20) {
        try {
            const from = (page - 1) * limit;

            // Truy vấn vào ES lấy dữ liệu, sắp xếp mới nhất lên đầu
            const result = await this.esService.search({
                index: 'audit-logs-*', // Quét trên tất cả các tháng
                from: from,
                size: limit,
                body: {
                    query: {
                        match_all: {} // Tương lai có thể đổi thành truy vấn lọc theo IP, Email...
                    },
                    sort: [
                        { timestamp: { order: 'desc' } }
                    ]
                }
            });

            // Elasticsearch trả về dữ liệu nằm sâu bên trong hits.hits._source
            // Ta cần làm phẳng nó ra cho Frontend dễ dùng
            const logs = result.hits.hits.map(hit => ({
                id: hit._id,
                ...(hit._source as any) // Ép kiểu để lấy các trường bên trong
            }));

            const total =
                typeof result.hits.total === 'number'
                    ? result.hits.total
                    : result.hits.total?.value ?? 0;

            return {
                total: total,
                page: page,
                limit: limit,
                data: logs
            };

        } catch (error) {
            this.logger.error(`Lỗi khi đọc log từ ES: ${error.message}`);
            throw error;
        }
    }

    async syncCampaign(campaign: any) {
        try {
            await this.esService.index({
                index: 'campaigns', // Lưu vào một "bảng" riêng tên là campaigns
                id: campaign.id.toString(), // Dùng chung ID với PostgreSQL để tránh trùng lặp
                document: {
                    title: campaign.title,
                    description: campaign.description,
                    targetAmount: campaign.targetAmount,
                    currentAmount: campaign.currentAmount,
                    status: campaign.status,
                    updatedAt: new Date().toISOString(),
                },
            });
            this.logger.log(` Đã đồng bộ Campaign [${campaign.id}] sang Elasticsearch`);
        } catch (error) {
            this.logger.error(`Lỗi đồng bộ Campaign: ${error.message}`);
        }
    }

    // Tìm kiếm mờ cho người dùng
    async searchCampaigns(keyword: string) {
        try {
            const result = await this.esService.search({
                index: 'campaigns',
                body: {
                    query: {
                        bool: {
                            must: [
                                { match: { status: 'Active' } } // Chỉ tìm các chiến dịch đang hoạt động
                            ],
                            should: [
                                {
                                    multi_match: {
                                        query: keyword,
                                        fields: ['title^3', 'description'], // Ưu tiên tìm trong tiêu đề (x3 trọng số)
                                        fuzziness: 'AUTO', // PHÉP THUẬT Ở ĐÂY: Tự động cho phép gõ sai chính tả
                                    }
                                }
                            ],
                            minimum_should_match: 1 // Bắt buộc phải khớp ít nhất 1 điều kiện ở should
                        }
                    }
                }
            });

            // Format lại kết quả cho Frontend
            return result.hits.hits.map(hit => ({
                id: hit._id,
                ...(hit._source as any),
                relevance_score: hit._score // Điểm độ chính xác của từ khóa
            }));
        } catch (error) {
            this.logger.error(`Lỗi tìm kiếm ES: ${error.message}`);
            return [];
        }
    }
}