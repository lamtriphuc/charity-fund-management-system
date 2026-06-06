import {
    BadRequestException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Donation } from './entities/donation.entity';
import { DataSource, Repository } from 'typeorm';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CreateDonationDto, DonationStatus, WebhookPaymentDto } from './dto/donation.dto';
import { User } from '../users/entities/user.entity';
import { LedgerService } from '../ledger/ledger.service';
import { Account } from '../ledger/entities/account.entity';
import { PayOS } from '@payos/node';
import { ConfigService } from '@nestjs/config';
import { CampaignStatus } from '../campaigns/dto/campaign.dto';
import { LedgerReferenceType } from '../ledger/dto/ledger.dto';
import { NotificationService } from '../system/notification.service';
import { NotificationType } from '../system/entities/notification.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditLogSeverity, AuditLogStatus } from '../audit/dto/create-audit-log.dto';

@Injectable()
export class DonationService {
    private payOS: PayOS;

    constructor(
        @InjectRepository(Donation)
        private readonly donationRepository: Repository<Donation>,
        @InjectRepository(Campaign)
        private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly dataSource: DataSource,
        private readonly ledgerService: LedgerService,
        private readonly notificationService: NotificationService,
        private configService: ConfigService,
        private readonly auditLogService: AuditLogService,
    ) {
        this.payOS = new PayOS({
            clientId: this.configService.getOrThrow('PAYOS_CLIENT_ID'),
            apiKey: this.configService.getOrThrow('PAYOS_API_KEY'),
            checksumKey: this.configService.getOrThrow('PAYOS_CHECKSUM_KEY'),
        });
    }

    async createDonation(
        campaignId: string,
        userId: string | null,
        dto: CreateDonationDto,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const campaign = await this.campaignRepository.findOne({
            where: { id: campaignId },
        });
        if (!campaign || campaign.status !== CampaignStatus.ACTIVE)
            throw new BadRequestException('Chiến dịch không tồn tại hoặc đã đóng.');

        const orderCode = Number(
            String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000),
        );
        const txReference = String(orderCode);

        let finalDonorName: string | null = null;

        if (!dto.isAnonymous) {
            if (dto.donorName) {
                finalDonorName = dto.donorName;
            } else if (userId) {
                const user = await this.userRepository.findOne({
                    where: { id: userId },
                });
                finalDonorName = user?.fullName ?? null;
            } else {
                finalDonorName = 'Khách vãn lai';
            }
        } else {
            finalDonorName = null;
        }

        const donation = this.donationRepository.create({
            campaign: { id: campaignId },
            donor: userId ? { id: userId } : null,
            amount: dto.amount,
            message: dto.message,
            isAnonymous: dto.isAnonymous,
            donorName: finalDonorName,
            txReference: txReference,
            status: DonationStatus.PENDING,
        });

        const savedDonation = await this.donationRepository.save(donation);

        await this.auditLogService.log({
            actorId: userId ?? 'anonymous',
            actorEmail: null,
            actorRole: userId ? 'DONOR' : 'GUEST',
            action: 'CREATE_DONATION_PENDING',
            entity: 'DONATION',
            entityId: savedDonation.id,
            before: null,
            after: {
                campaignId,
                donorId: userId,
                amount: savedDonation.amount,
                isAnonymous: savedDonation.isAnonymous,
                donorName: savedDonation.isAnonymous ? null : savedDonation.donorName,
                paymentMethod: savedDonation.paymentMethod,
                txReference: savedDonation.txReference,
                status: savedDonation.status,
            },
            metadata: {
                campaignTitle: campaign.title,
                paymentProvider: 'PAYOS',
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.INFO,
        });

        const cleanTitle = campaign.title
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
            .replace(/đ/g, 'd')
            .replace(/Đ/g, 'D') // Chữ Đ đặc biệt
            .replace(/[^a-zA-Z0-9]/g, '') // Xóa khoảng trắng và ký tự đặc biệt
            .toUpperCase();

        //  UH + Mã Code + Tên chiến dịch (Tối đa 25 ký tự theo rule của Ngân hàng)
        const payosDescription = `UH ${orderCode} ${cleanTitle}`.substring(0, 25);

        // Tạo QR bằng PayOS
        try {
            const requestData = {
                orderCode: orderCode,
                amount: Number(dto.amount),
                description: payosDescription,
                cancelUrl: `http://localhost:5173/campaigns/${campaignId}`,
                returnUrl: `http://localhost:5173/campaigns/${campaignId}?success=true`,
            };

            const paymentLink = await this.payOS.paymentRequests.create(requestData);

            return {
                message: 'Đã tạo phiên quyên góp. Vui lòng thanh toán.',
                txReference: txReference,
                amount: dto.amount,
                qrCodeData: paymentLink.qrCode,
                accountNumber: paymentLink.accountNumber,
                accountName: paymentLink.accountName,
                description: paymentLink.description,
                bin: paymentLink.bin,
            };
        } catch (error) {
            console.error('Lỗi gọi API PayOS:', error);

            await this.auditLogService.log({
                actorId: userId ?? 'anonymous',
                actorEmail: null,
                actorRole: userId ? 'DONOR' : 'GUEST',
                action: 'CREATE_DONATION_PAYMENT_LINK_FAILED',
                entity: 'DONATION',
                entityId: savedDonation.id,
                metadata: {
                    campaignId,
                    amount: dto.amount,
                    paymentProvider: 'PAYOS',
                    reason: 'PAYOS_CREATE_PAYMENT_LINK_FAILED',
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                status: AuditLogStatus.FAILED,
                severity: AuditLogSeverity.WARN,
            });

            await this.donationRepository.delete(savedDonation.id);
            throw new InternalServerErrorException(
                'Không thể tạo mã thanh toán lúc này. Vui lòng thử lại sau.',
            );
        }
    }

    async cancelPendingDonation(
        txReference: string,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const donation = await this.donationRepository.findOne({
            where: {
                txReference,
                status: DonationStatus.PENDING,
            },
            relations: ['campaign', 'donor'],
        });

        if (!donation) {
            return { message: 'Không có giao dịch pending cần dọn dẹp' };
        }

        await this.donationRepository.delete(donation.id);

        await this.auditLogService.log({
            actorId: donation.donor?.id ?? 'anonymous',
            actorEmail: null,
            actorRole: donation.donor ? 'DONOR' : 'GUEST',
            action: 'CANCEL_PENDING_DONATION',
            entity: 'DONATION',
            entityId: donation.id,
            before: {
                status: donation.status,
                amount: donation.amount,
                txReference: donation.txReference,
                campaignId: donation.campaign?.id,
            },
            after: null,
            metadata: {
                reason: 'USER_CLOSED_PAYMENT_POPUP_OR_TIMEOUT',
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.INFO,
        });


        return { message: 'Đã dọn dẹp giao dịch rác' };
    }

    // Hàm cho Frontend Polling
    async checkDonationStatus(txReference: string) {
        const donation = await this.donationRepository.findOne({
            where: { txReference },
            select: ['status'],
        });
        if (!donation) throw new NotFoundException('Không tìm thấy giao dịch');
        return { status: donation.status };
    }

    async processPaymentWebhook(
        dto: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        let webhookData;
        try {
            // Hàm này của PayOS sẽ throw error nếu chữ ký không khớp
            webhookData = this.payOS.webhooks.verify(dto);
        } catch (error) {
            await this.auditLogService.log({
                actorId: 'PAYOS_WEBHOOK',
                actorEmail: null,
                actorRole: 'EXTERNAL_SYSTEM',
                action: 'PAYMENT_WEBHOOK_INVALID_SIGNATURE',
                entity: 'DONATION',
                entityId: null,
                metadata: {
                    reason: 'INVALID_WEBHOOK_SIGNATURE',
                    rawOrderCode: dto?.data?.orderCode ?? null,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                status: AuditLogStatus.FAILED,
                severity: AuditLogSeverity.CRITICAL,
            });

            throw new BadRequestException(
                'Chữ ký Webhook không hợp lệ! Phát hiện nghi vấn tấn công.',
            );
        }

        const txReference = String(dto.data.orderCode);
        const isSuccess = dto.success === true || dto.code === '00';

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const donation = await queryRunner.manager.createQueryBuilder(Donation, 'donation')
                .innerJoinAndSelect('donation.campaign', 'campaign')
                .where('donation.txReference = :txReference', { txReference })
                .setLock('pessimistic_write')
                .getOne();

            if (!donation) throw new NotFoundException('Không tìm thấy giao dịch');

            const before = {
                status: donation.status,
            };

            if (donation.status === DonationStatus.SUCCESS) {
                await queryRunner.rollbackTransaction();

                await this.auditLogService.log({
                    actorId: 'PAYOS',
                    actorEmail: null,
                    actorRole: 'PAYMENT_PROVIDER',
                    action: 'PAYMENT_WEBHOOK_DUPLICATED',
                    entity: 'DONATION',
                    entityId: donation.id,
                    metadata: {
                        txReference,
                        paymentProvider: 'PAYOS',
                    },
                    ipAddress: requestInfo.ipAddress,
                    userAgent: requestInfo.userAgent,
                    status: AuditLogStatus.SUCCESS,
                    severity: AuditLogSeverity.INFO,
                });

                return { message: 'Giao dịch này đã được xử lý rồi' };
            }

            if (isSuccess) {
                donation.status = DonationStatus.SUCCESS;
                await queryRunner.manager.save(donation);

                // TÍCH HỢP INTERNAL LEDGER
                // Nghiệp vụ: Nhận tiền tài trợ
                // Nợ (Debit) TK Ngân hàng: Tăng tài sản
                // Có (Credit) TK Quỹ Chiến dịch: Tăng nguồn vốn (trách nhiệm phải chi)

                const cashAccount = await queryRunner.manager.findOne(Account, {
                    where: { code: 'SYS_BANK_MAIN' },
                });
                if (!cashAccount) {
                    throw new InternalServerErrorException(
                        'Lỗi nghiêm trọng: Không tìm thấy tài khoản ngân hàng tổng (SYS_BANK_MAIN)',
                    );
                }

                await this.ledgerService.recordTransaction(
                    queryRunner.manager,
                    LedgerReferenceType.DONATION,
                    donation.id,
                    `Nhận quyên góp từ mã GD PayOS: ${donation.txReference}`,
                    [
                        {
                            accountCode: 'SYS_BANK_MAIN',
                            isDebit: true, // Nợ (Tăng tài sản)
                            amount: Number(donation.amount),
                        },
                        {
                            accountCode: `CAMP_${donation.campaign.id}_FUND`,
                            isDebit: false,
                            amount: Number(donation.amount),
                        },
                    ],
                );

                // Cộng tiền vào tổng của chiến dịch
                const campaign = donation.campaign;
                campaign.currentAmount = Number(campaign.currentAmount) + Number(donation.amount);
                await queryRunner.manager.save(campaign);

                // [THÊM LOGIC THÔNG BÁO]
                const fullCampaign = await queryRunner.manager.findOne(Campaign, {
                    where: { id: campaign.id },
                    relations: ['createdBy']
                });

                if (fullCampaign && fullCampaign.createdBy) {
                    await this.notificationService.sendNotification(
                        fullCampaign.createdBy.id,
                        fullCampaign.createdBy.email,
                        'Có người vừa quyên góp!',
                        `${donation.donorName || 'Một nhà hảo tâm'} vừa ủng hộ ${Number(donation.amount).toLocaleString('vi-VN')}đ vào chiến dịch "${fullCampaign.title}".`,
                        NotificationType.INFO,
                        `/campaigns/${fullCampaign.id}/manage`
                    );
                }
            } else {
                donation.status = DonationStatus.FAILED;
                await queryRunner.manager.save(donation);
            }


            await queryRunner.commitTransaction();

            try {
                await this.auditLogService.log({
                    actorId: 'PAYOS',
                    actorEmail: null,
                    actorRole: 'PAYMENT_PROVIDER',
                    action: isSuccess ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED',
                    entity: 'DONATION',
                    entityId: donation.id,
                    before,
                    after: {
                        status: donation.status,
                    },
                    metadata: {
                        campaignId: donation.campaign.id,
                        amount: donation.amount,
                        txReference: donation.txReference,
                        paymentProvider: 'PAYOS',
                        creditedAccount: isSuccess ? `CAMP_${donation.campaign.id}_FUND` : null,
                        debitedAccount: isSuccess ? 'SYS_BANK_MAIN' : null,
                        referenceType: isSuccess ? LedgerReferenceType.DONATION : null,
                    },
                    ipAddress: requestInfo.ipAddress,
                    userAgent: requestInfo.userAgent,
                    status: isSuccess ? AuditLogStatus.SUCCESS : AuditLogStatus.FAILED,
                    severity: AuditLogSeverity.WARN,
                });
            } catch (auditError) {
                console.error(`Không thể ghi audit log webhook donation ${donation.id}:`, auditError);
            }

            return { message: 'Xử lý Webhook thành công' };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async getDonationsByCampaign(campaignId: string) {
        const donations = await this.donationRepository.find({
            where: { campaign: { id: campaignId }, status: DonationStatus.SUCCESS },
            order: { createdAt: 'DESC' },
            relations: ['donor'],
        });

        // Ẩn tên nếu họ chọn isAnonymous
        return donations.map((d) => ({
            id: d.id,
            amount: d.amount,
            message: d.message,
            createdAt: d.createdAt,
            donorName: d.isAnonymous
                ? 'Nhà hảo tâm ẩn danh'
                : d.donor?.fullName || 'Khách vãng lai',
        }));
    }

    // Lấy sao kê - toàn bộ donate của hệ thống
    async getStatements(
        page: number = 1,
        limit: number = 20,
        keyword: string = '',
        sortBy: string = 'createdAt',
        sortOrder: 'DESC' | 'ASC' = 'DESC',
    ) {
        const query = this.donationRepository
            .createQueryBuilder('donation')
            .leftJoinAndSelect('donation.campaign', 'campaign')
            .leftJoinAndSelect('donation.donor', 'donor')
            .where('donation.status = :status', { status: 'SUCCESS' });

        if (keyword) {
            // Tìm kiếm theo Mã giao dịch, Tên người chuyển hoặc Lời nhắn
            query.andWhere(
                '(donation.txReference ILIKE :keyword OR donation.donorName ILIKE :keyword OR donor.fullName ILIKE :keyword OR donation.message ILIKE :keyword)',
                { keyword: `%${keyword}%` },
            );
        }

        const sortMap = {
            createdAt: 'donation.createdAt',
            amount: 'donation.amount',
        };
        const dbSortField = sortMap[sortBy] || 'donation.createdAt';

        // Mới nhất xếp lên đầu
        query
            .orderBy(dbSortField, sortOrder)
            .skip((page - 1) * limit)
            .take(limit);

        const [items, total] = await query.getManyAndCount();

        const mappedItems = items.map((d) => ({
            id: d.id,
            txReference: d.txReference,
            amount: d.amount,
            message: d.message,
            createdAt: d.createdAt,
            campaignTitle: d.campaign?.title,
            donorName: d.isAnonymous
                ? 'Nhà hảo tâm ẩn danh'
                : d.donorName || d.donor?.fullName || 'Khách vãng lai',
        }));

        return {
            data: mappedItems,
            total,
            currentPage: Number(page),
            totalPages: Math.ceil(total / limit),
        };
    }

    async getMyDonations(userId: string) {
        const donations = await this.donationRepository.find({
            where: { donor: { id: userId } },
            relations: ['campaign'],
            order: { createdAt: 'DESC' }
        });

        const mappedData = donations.map(d => ({
            id: d.id,
            amount: d.amount,
            createdAt: d.createdAt,
            message: d.message,
            campaignTitle: d.campaign?.title || 'Chiến dịch đã xóa'
        }));

        return { data: mappedData };
    }
}
