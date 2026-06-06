import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationService {
    private transporter: nodemailer.Transporter;
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectRepository(Notification) private notifRepo: Repository<Notification>,
        @InjectRepository(User) private userRepository: Repository<User>, // Thêm dòng này
        private configService: ConfigService
    ) {
        // Cấu hình SMTP (Khuyên dùng Gmail App Password hoặc Brevo/SendGrid)
        this.transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: this.configService.get('SMTP_EMAIL'),
                pass: this.configService.get('SMTP_PASSWORD'),
            },
        });
    }

    /**
     * Hàm dùng chung để gửi thông báo
     * @param sendEmail Nếu true, sẽ bắn cả In-App và Email
     */
    async sendNotification(
        userId: string,
        userEmail: string,
        title: string,
        content: string,
        type: NotificationType,
        actionLink?: string,
        sendEmail: boolean = false
    ) {
        // 1. Lưu In-App Notification vào Database
        const notif = this.notifRepo.create({
            user: { id: userId },
            title,
            content,
            type,
            actionLink
        });
        await this.notifRepo.save(notif);

        // 2. Gửi Email nếu đây là hành động quan trọng
        if (sendEmail && userEmail) {
            // Xử lý biến đường dẫn tương đối thành tuyệt đối
            let fullActionLink = '';
            if (actionLink) {
                // Lấy URL Frontend từ .env (Nếu không có thì mặc định lấy localhost:5173 của Vite)
                const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

                // Chuẩn hóa dấu slash (/) để ghép nối không bị lỗi (vd: http://localhost:5173//admin...)
                const cleanBaseUrl = frontendUrl.replace(/\/$/, '');
                const cleanPath = actionLink.startsWith('/') ? actionLink : `/${actionLink}`;

                fullActionLink = `${cleanBaseUrl}${cleanPath}`;
            }

            try {
                await this.transporter.sendMail({
                    from: `"CharityFund" <${this.configService.get('SMTP_EMAIL')}>`,
                    to: userEmail,
                    subject: `[CharityFund] ${title}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
                            <h2 style="color: #1a202c; border-bottom: 2px solid #f97316; padding-bottom: 10px;">${title}</h2>
                            <p style="color: #4a5568; line-height: 1.6; font-size: 15px;">${content}</p>
                            
                            ${fullActionLink ? `
                                <div style="margin: 25px 0; text-align: center;">
                                    <a href="${fullActionLink}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
                                        Truy cập Hệ thống
                                    </a>
                                </div>
                            ` : ''}
                            
                            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-top: 30px;" />
                            <p style="color: #a0aec0; font-size: 12px; text-align: center;">
                                Đây là email tự động từ hệ thống CharityFund.<br/>Vui lòng không phản hồi lại địa chỉ này.
                            </p>
                        </div>
                    `
                });
                this.logger.log(`Gửi mail thành công tới: ${userEmail}`);
            } catch (error) {
                this.logger.error(`Lỗi gửi email tới ${userEmail}:`, error.message);
            }
        }
    }

    async notifyUsersByRole(
        roles: string[],
        title: string,
        content: string,
        type: NotificationType,
        actionLink?: string,
        sendEmail: boolean = false
    ) {
        const targets = await this.userRepository.createQueryBuilder('user')
            .leftJoinAndSelect('user.role', 'role')
            .where('role.name IN (:...roles)', { roles })
            .getMany();

        for (const target of targets) {
            await this.sendNotification(target.id, target.email, title, content, type, actionLink, sendEmail);
        }
    }

    // Lấy thông báo của user (mới nhất lên đầu)
    async getMyNotifications(userId: string) {
        return this.notifRepo.find({
            where: { user: { id: userId } },
            order: { createdAt: 'DESC' },
            take: 20 // Chỉ lấy 20 thông báo gần nhất cho nhẹ
        });
    }

    // Đánh dấu 1 thông báo đã đọc
    async markAsRead(id: string, userId: string) {
        await this.notifRepo.update({ id, user: { id: userId } }, { isRead: true });
        return { message: 'Đã đọc' };
    }

    // Đánh dấu tất cả đã đọc
    async markAllAsRead(userId: string) {
        await this.notifRepo.update({ user: { id: userId }, isRead: false }, { isRead: true });
        return { message: 'Đã đọc tất cả' };
    }
}