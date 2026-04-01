import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Campaign } from './campaign.entity';
import { User } from '../../users/entities/user.entity';

@Entity('campaign_volunteers')
export class CampaignVolunteer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => Campaign)
    @JoinColumn({ name: 'campaign_id' })
    campaign: Campaign;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'volunteer_id' })
    volunteer: User;

    @Column({ type: 'varchar', default: 'Pending' })
    status: string; // Pending, Active, Completed, Banned
}