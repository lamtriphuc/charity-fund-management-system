import { User } from 'src/modules/users/entities/user.entity';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

export enum NotificationType {
    INFO = 'INFO',
    SUCCESS = 'SUCCESS',
    WARNING = 'WARNING',
    URGENT = 'URGENT'
}

@Entity('notifications')
export class Notification {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'varchar' })
    title: string;

    @Column({ type: 'text' })
    content: string;

    @Column({ type: 'enum', enum: NotificationType, default: NotificationType.INFO })
    type: NotificationType;

    @Column({ name: 'is_read', type: 'boolean', default: false })
    isRead: boolean;

    @Column({ name: 'action_link', type: 'varchar', nullable: true })
    actionLink: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}