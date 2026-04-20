import { EntitySubscriberInterface, EventSubscriber, InsertEvent, UpdateEvent } from "typeorm";
import { Campaign } from "./entities/campaign.entity";
import { SearchService } from "../search/search.service";

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

    // Khi có 1 chiến dịch được CẬP NHẬT (VD: Có người nạp tiền -> Tăng currentAmount)
    async afterUpdate(event: UpdateEvent<Campaign>) {
        if (event.entity) {
            // Ép kiểu để lấy dữ liệu mới nhất gộp với dữ liệu cũ
            const updatedCampaign = { ...event.databaseEntity, ...event.entity };
            await this.searchService.syncCampaign(updatedCampaign);
        }
    }
}