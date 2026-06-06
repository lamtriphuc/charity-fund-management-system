import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from "typeorm";
import { Campaign } from "./entities/campaign.entity";
import { SearchService } from "../search/search.service";
import { CampaignStatus } from "./dto/campaign.dto";

@EventSubscriber()
export class CampaignSubscriber implements EntitySubscriberInterface<Campaign> {
    constructor(private readonly searchService: SearchService) { }

    listenTo() {
        return Campaign;
    }

    async afterInsert(event: InsertEvent<Campaign>) {
        if (event.entity) {
            await this.searchService.syncCampaign(event.entity);
        }
    }

    async beforeUpdate(event: UpdateEvent<Campaign>) {
        const entity = event.entity as Partial<Campaign>;
        const dbEntity = event.databaseEntity;

        if (!entity || !dbEntity) return;

        // Nếu có cập nhật số tiền và chiến dịch đang ACTIVE
        if (entity.currentAmount !== undefined && dbEntity.status === CampaignStatus.ACTIVE) {
            const newAmount = Number(entity.currentAmount);
            const targetAmount = Number(dbEntity.targetAmount);

            // TỰ ĐỘNG ĐÓNG: Nếu số dư mới >= mục tiêu
            if (newAmount >= targetAmount) {
                entity.status = CampaignStatus.COMPLETED;
                console.log(`[Auto-Close] Chiến dịch "${dbEntity.title}" đã đạt mục tiêu sớm và tự động đóng!`);
            }
        }
    }

    async afterUpdate(event: UpdateEvent<Campaign>) {
        if (event.entity) {
            // Ép kiểu để lấy dữ liệu mới nhất gộp với dữ liệu cũ
            const updatedCampaign = { ...event.databaseEntity, ...event.entity };
            await this.searchService.syncCampaign(updatedCampaign);
        }
    }
}