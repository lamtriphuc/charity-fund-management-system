import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { IAuditLog } from "../cron/log-archiver.service";

@Injectable()
export class SearchService implements OnApplicationBootstrap {
    private readonly logger = new Logger(SearchService.name);

    constructor(
        private readonly esService: ElasticsearchService,
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>
    ) { }

    // tự động chạy hàm này để đồng bộ campaigns vs es
    async onApplicationBootstrap() {
        this.logger.log(' Đang kiểm tra và đồng bộ dữ liệu lên Elasticsearch...');
        await this.reindexAllCampaigns();
    }

    async reindexAllCampaigns() {
        try {
            // 1. Xóa index cũ (nếu có)
            const indexExists = await this.esService.indices.exists({ index: 'campaigns' });
            if (indexExists) {
                await this.esService.indices.delete({ index: 'campaigns' });
                this.logger.log(' Đã xóa Index cũ trên Elasticsearch.');
            }

            // THÊM ĐOẠN NÀY: Chủ động tạo lại một Index mới tinh (dù DB đang trống)
            await this.esService.indices.create({
                index: 'campaigns',
                body: {
                    mappings: {
                        properties: {
                            title: {
                                type: 'text',
                                fields: { keyword: { type: 'keyword', ignore_above: 256 } }
                            },
                            description: { type: 'text' }, // Mô tả chỉ cần text để tìm kiếm mờ
                            category: { type: 'keyword' }, // Danh mục dùng keyword để lọc chính xác 100%
                            status: { type: 'keyword' },   // Trạng thái dùng keyword
                            targetAmount: { type: 'long' },  // BẮT BUỘC LÀ SỐ (long: số nguyên lớn)
                            currentAmount: { type: 'long' }, // BẮT BUỘC LÀ SỐ
                            startDate: { type: 'date' },
                            endDate: { type: 'date' },
                            imageUrl: { type: 'text', index: false } // URL không cần mang ra tìm kiếm để nhẹ DB
                        }
                    }
                }
            });
            this.logger.log(' Đã tạo Index [campaigns]');

            // 2. Lấy toàn bộ chiến dịch đang có trong PostgreSQL
            const allCampaigns = await this.campaignRepository.find();

            if (allCampaigns.length === 0) {
                this.logger.log(' Không có chiến dịch nào trong DB. Bỏ qua bước đẩy dữ liệu.');
                return; // Dù return ở đây, nhưng Index rỗng đã được tạo ở trên rồi!
            }

            for (const camp of allCampaigns) {
                await this.esService.index({
                    index: 'campaigns',
                    id: camp.id.toString(),
                    document: {
                        title: camp.title,
                        description: camp.description,
                        targetAmount: Number(camp.targetAmount),
                        currentAmount: Number(camp.currentAmount),
                        imageUrls: camp.imageUrls,
                        category: camp.category,
                        status: camp.status,
                        campaignType: camp.campaignType,
                        startDate: camp.startDate,
                        endDate: camp.endDate,
                        createdAt: camp.createdAt,
                        updatedAt: camp.updatedAt,
                    },
                });
            }

            this.logger.log(` Đã đồng bộ thành công ${allCampaigns.length} chiến dịch lên Elasticsearch!`);

        } catch (error) {
            // this.logger.error(` Lỗi đồng bộ toàn bộ ES: ${error.message}`);
        }
    }

    async logAction(actionData: any) {
        try {
            const date = new Date();
            const month = String(date.getMonth() + 1).padStart(2, '0');

            const indexName = `audit-logs-${date.getFullYear()}-${month}`;

            await this.esService.index({
                index: indexName,
                document: {
                    ...actionData,
                    timestamp: actionData.timestamp ?? new Date().toISOString(),
                }
            });
        } catch (error) {
            this.logger.error(`Không thể đẩy log sang Elasticsearch: ${error.message}`);
        }
    }

    async searchAuditLogs(page: number = 1, limit: number = 20, keyword?: string, startDate?: string, endDate?: string) {
        try {
            const from = (page - 1) * limit;

            const mustQueries: any[] = [];

            if (startDate && endDate) {
                mustQueries.push({
                    range: {
                        timestamp: {
                            gte: startDate, // Lớn hơn hoặc bằng
                            lte: endDate    // Nhỏ hơn hoặc bằng
                        }
                    }
                });
            }

            // if (keyword && keyword.trim() !== '') {
            //     // Escape các ký tự đặc biệt của Elasticsearch để tránh lỗi khi người dùng gõ linh tinh
            //     const safeKeyword = keyword.trim().replace(/[+\-=&|><!(){}\[\]^"~*?:\\/]/g, '\\$&');

            //     mustQueries.push({
            //         query_string: {
            //             // Bao bọc keyword bởi dấu * để tìm kiếm chứa (LIKE %keyword%)
            //             query: `*${safeKeyword}*`,
            //             // Thêm ip_address vào để họ có thể search theo IP luôn
            //             fields: ['action', 'actor_email', 'entity', 'entity_id', 'actor_role', 'ip_address']
            //         }
            //     });
            // }

            if (keyword && keyword.trim() !== '') {
                const kw = keyword.trim();

                mustQueries.push({
                    bool: {
                        should: [
                            { wildcard: { 'actor_email.keyword': { value: `*${kw}*`, case_insensitive: true } } },
                            { wildcard: { 'actor_role.keyword': { value: `*${kw}*`, case_insensitive: true } } },
                            { wildcard: { 'action.keyword': { value: `*${kw}*`, case_insensitive: true } } },
                            { wildcard: { 'entity.keyword': { value: `*${kw}*`, case_insensitive: true } } },
                            { wildcard: { 'entity_id.keyword': { value: `*${kw}*`, case_insensitive: true } } },
                            { wildcard: { 'ip_address.keyword': { value: `*${kw}*`, case_insensitive: true } } },
                            { wildcard: { 'user_agent.keyword': { value: `*${kw}*`, case_insensitive: true } } },
                        ],
                        minimum_should_match: 1,
                    },
                });
            }

            const queryBody: any = mustQueries.length > 0
                ? { bool: { must: mustQueries } }
                : { match_all: {} };

            // Truy vấn vào ES lấy dữ liệu, sắp xếp mới nhất lên đầu
            const result = await this.esService.search({
                index: 'audit-logs-*', // Quét trên tất cả các tháng
                from: from,
                size: limit,
                body: {
                    query: queryBody,
                    sort: [{ timestamp: { order: 'desc' } }]
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
                index: 'campaigns',
                id: campaign.id.toString(),
                document: {
                    title: campaign.title,
                    description: campaign.description,
                    targetAmount: Number(campaign.targetAmount),
                    currentAmount: Number(campaign.currentAmount),
                    category: campaign.category,
                    status: campaign.status,
                    campaignType: campaign.campaignType,
                    imageUrls: campaign.imageUrls,
                    startDate: campaign.startDate,
                    endDate: campaign.endDate,
                    createdAt: campaign.createdAt,
                    updatedAt: new Date().toISOString(),
                },
            });
            this.logger.log(` Đã đồng bộ Campaign [${campaign.id}] sang Elasticsearch`);
        } catch (error) {
            this.logger.error(`Lỗi đồng bộ Campaign: ${error.message}`);
        }
    }

    async searchCampaigns(
        keyword?: string,
        category?: string,
        status?: string,
        page: any = 1,
        limit: any = 9
    ) {
        try {
            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 9;
            const from = (pageNum - 1) * limitNum;

            const normalizedCategory = decodeURIComponent(category || '')
                .replace(/\+/g, ' ')
                .trim();

            const normalizedStatus = decodeURIComponent(status || '')
                .replace(/\+/g, ' ')
                .trim();

            const mustQueries: any[] = [];

            if (normalizedStatus === 'ALL') {
                mustQueries.push({
                    terms: { status: ['ACTIVE', 'COMPLETED'] }
                });
            } else if (normalizedStatus && normalizedStatus !== 'ALL') {
                mustQueries.push({
                    term: { status: normalizedStatus }
                });
            } else {
                mustQueries.push({
                    term: { status: 'ACTIVE' }
                });
            }

            if (normalizedCategory && normalizedCategory !== 'Tất cả') {
                mustQueries.push({
                    term: { category: normalizedCategory }
                });
            }

            if (keyword && keyword.trim() !== '') {
                mustQueries.push({
                    multi_match: {
                        query: keyword.trim(),
                        fields: ['title', 'description'],
                        fuzziness: 'AUTO'
                    }
                });
            }

            const response = await this.esService.search({
                index: 'campaigns',
                from,
                size: limitNum,
                query: {
                    bool: {
                        must: mustQueries
                    }
                },
                sort: [
                    { status: { order: 'asc' } },
                    { createdAt: { order: 'desc' } },
                    { updatedAt: { order: 'desc' } }
                ]
            });

            const rawResponse: any = response;
            const esBody = rawResponse.body ? rawResponse.body : rawResponse;
            const hitsArray = esBody?.hits?.hits || [];

            const total = typeof esBody?.hits?.total === 'number'
                ? esBody.hits.total
                : esBody?.hits?.total?.value || 0;

            const data = hitsArray.map((hit: any) => ({
                id: hit._id,
                ...hit._source,
                relevance_score: hit._score
            }));

            return {
                data,
                meta: {
                    totalItems: total,
                    itemCount: data.length,
                    itemsPerPage: limitNum,
                    totalPages: Math.ceil(total / limitNum),
                    currentPage: pageNum,
                }
            };

        } catch (error) {
            console.error('LỖI TÌM KIẾM ES:', error);

            return {
                data: [],
                meta: {
                    totalItems: 0,
                    itemCount: 0,
                    itemsPerPage: Number(limit) || 9,
                    totalPages: 0,
                    currentPage: Number(page) || 1
                }
            };
        }
    }

    // Tìm log cũ
    async getLogsOlderThan(dateString: string): Promise<IAuditLog[]> {
        const response = await this.esService.search({
            index: 'audit-logs-*',
            size: 10000,
            body: {
                query: {
                    range: {
                        timestamp: {
                            lt: dateString
                        }
                    }
                }
            }
        });

        // Ép kiểu _source về IAuditLog để TypeScript hiểu
        return response.hits.hits.map(hit => hit._source as IAuditLog);
    }

    // Xóa log cũ
    async deleteLogsOlderThan(dateString: string) {
        await this.esService.deleteByQuery({
            index: 'audit-logs-*',
            body: {
                query: {
                    range: {
                        timestamp: {
                            lt: dateString
                        }
                    }
                }
            }
        });
    }
}