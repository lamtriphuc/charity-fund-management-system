import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { ElasticsearchService } from "@nestjs/elasticsearch";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

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

            // 👇 THÊM ĐOẠN NÀY: Chủ động tạo lại một Index mới tinh (dù DB đang trống)
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
            this.logger.log('✨ Đã tạo Index [campaigns] với cấu hình Mapping chuẩn Enterprise.');

            // 2. Lấy toàn bộ chiến dịch đang có trong PostgreSQL
            const allCampaigns = await this.campaignRepository.find();

            if (allCampaigns.length === 0) {
                this.logger.log(' Không có chiến dịch nào trong DB. Bỏ qua bước đẩy dữ liệu.');
                return; // Dù return ở đây, nhưng Index rỗng đã được tạo ở trên rồi!
            }

            // 3. Đẩy tất cả lên Elasticsearch
            for (const camp of allCampaigns) {
                await this.esService.index({
                    index: 'campaigns',
                    id: camp.id.toString(),
                    document: {
                        title: camp.title,
                        description: camp.description,
                        targetAmount: camp.targetAmount,
                        currentAmount: camp.currentAmount,
                        status: camp.status,
                        category: camp.category,
                        updatedAt: camp.updatedAt,
                    },
                });
            }

            this.logger.log(` Đã đồng bộ thành công ${allCampaigns.length} chiến dịch lên Elasticsearch!`);

        } catch (error) {
            this.logger.error(` Lỗi đồng bộ toàn bộ ES: ${error.message}`);
        }
    }

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
                index: 'campaigns',
                id: campaign.id.toString(), // Dùng chung ID với PostgreSQL để tránh trùng lặp
                document: {
                    title: campaign.title,
                    description: campaign.description,
                    targetAmount: campaign.targetAmount,
                    currentAmount: campaign.currentAmount,
                    category: campaign.category,
                    status: campaign.status,
                    updatedAt: new Date().toISOString(),
                },
            });
            this.logger.log(` Đã đồng bộ Campaign [${campaign.id}] sang Elasticsearch`);
        } catch (error) {
            this.logger.error(`Lỗi đồng bộ Campaign: ${error.message}`);
        }
    }

    // async searchCampaigns(keyword?: string, category?: string) {
    //     try {
    //         console.log('\n=== BẮT ĐẦU TÌM KIẾM ES ===');
    //         console.log(`📥 Đầu vào -> Keyword: "${keyword || ''}" | Category: "${category || ''}"`);

    //         // Khởi tạo điều kiện bắt buộc: Trạng thái ACTIVE
    //         const mustQueries: any[] = [{ match: { status: 'ACTIVE' } }];

    //         if (category && category !== 'Tất cả') {
    //             mustQueries.push({ match: { category: category } });
    //         }

    //         const queryBody: any = {
    //             bool: {
    //                 must: mustQueries,
    //             }
    //         };

    //         if (keyword && keyword.trim() !== '') {
    //             queryBody.bool.should = [
    //                 {
    //                     multi_match: {
    //                         query: keyword,
    //                         fields: ['title^3', 'description'],
    //                         fuzziness: 'AUTO',
    //                     }
    //                 }
    //             ];
    //             queryBody.bool.minimum_should_match = 1;
    //         }


    //         const response = await this.esService.search({
    //             index: 'campaigns',
    //             size: 100,
    //             query: { match_all: {} }
    //             // query: queryBody  <-- Tí nữa có data rồi thì mở lại dòng này
    //         });

    //         // Lấy data theo chuẩn v8
    //         const hitsArray = response.hits?.hits || [];

    //         console.log(`✅ Lọc thành công! Tìm thấy ${hitsArray.length} chiến dịch.`);


    //         return hitsArray.map(hit => ({
    //             id: hit._id,
    //             ...(hit._source as any),
    //             relevance_score: hit._score
    //         }));

    //     } catch (error) {
    //         console.log('\n❌ ES BÁO LỖI CRASH:', error); // Dùng console.log để đảm bảo luôn hiện lỗi đỏ
    //         return [];
    //     }
    // }

    async searchCampaigns(keyword?: string, category?: string, page: any = 1, limit: any = 9) {
        try {
            const pageNum = Number(page) || 1;
            const limitNum = Number(limit) || 9;
            const from = (pageNum - 1) * limitNum;

            const mustQueries: any[] = [
                {
                    terms: { status: ['ACTIVE', 'COMPLETED'] }
                }
            ];

            if (category && category !== 'Tất cả') {
                mustQueries.push({ match: { category: category } });
            }

            const queryBody: any = {
                bool: { must: mustQueries }
            };

            if (keyword && keyword.trim() !== '') {
                queryBody.bool.must.push({
                    multi_match: {
                        query: keyword,
                        fields: ['title', 'description'],
                        fuzziness: 'AUTO'
                    }
                });
            }

            // GỌI API XUỐNG ES
            const response = await this.esService.search({
                index: 'campaigns',
                from: from,
                size: limitNum,
                query: queryBody
            });

            // BÓC TÁCH DỮ LIỆU BẤT CHẤP PHIÊN BẢN (V7 hay V8)
            const rawResponse: any = response;
            const esBody = rawResponse.body ? rawResponse.body : rawResponse;
            const hitsArray = esBody?.hits?.hits || [];

            const total = typeof esBody?.hits?.total === 'number'
                ? esBody.hits.total
                : (esBody?.hits?.total?.value || 0);

            console.log(`✅ [Search ES] Lọc thành công: Ra ${hitsArray.length} chiến dịch (Tổng: ${total})`);

            const data = hitsArray.map((hit: any) => ({
                id: hit._id,
                ...hit._source,
                relevance_score: hit._score
            }));

            // TRẢ VỀ FORMAT FE CẦN
            return {
                data: data,
                meta: {
                    totalItems: total,
                    itemCount: data.length,
                    itemsPerPage: limitNum,
                    totalPages: Math.ceil(total / limitNum),
                    currentPage: pageNum,
                }
            };

        } catch (error) {
            console.error('🔥 LỖI TÌM KIẾM ES:', error);
            return {
                data: [],
                meta: { totalItems: 0, itemCount: 0, itemsPerPage: limit, totalPages: 0, currentPage: 1 }
            };
        }
    }
}