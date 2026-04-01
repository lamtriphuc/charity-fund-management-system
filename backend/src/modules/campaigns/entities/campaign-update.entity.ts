import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Campaign } from "./campaign.entity";

@Entity('campaign_updates')
export class CampaignUpdate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @Column({ type: 'varchar' })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ name: 'image_urls', type: 'jsonb', nullable: true })
    imageUrls: string[];

    @Column({ name: 'created_at', type: 'timestamp' })
    createdAt: Date
}