import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { DataSource, LessThan, Repository } from 'typeorm';
import { CampaignStatus, CreateCampaignDto, GetCampaignsQueryDto, UpdateCampaignStatusDto } from './dto/campaign.dto';
import { Account } from '../ledger/entities/account.entity';
import { AccountType, LedgerReferenceType } from '../ledger/dto/ledger.dto';
import { User } from '../users/entities/user.entity';
import { CloudinaryFolder, CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { LedgerService } from '../ledger/ledger.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationService } from '../system/notification.service';
import { NotificationType } from '../system/entities/notification.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditLogSeverity, AuditLogStatus } from '../audit/dto/create-audit-log.dto';
import { SearchService } from '../search/search.service';

@Injectable()
export class CampaignService {
    constructor(
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
        private readonly cloudinaryService: CloudinaryService,
        private readonly ledgerService: LedgerService,
        private readonly notificationService: NotificationService,
        private readonly auditLogService: AuditLogService,
        private readonly searchService: SearchService,
        private dataSource: DataSource,
    ) { }

    async create(
        currentUser: any,
        dto: CreateCampaignDto,
        files: { coverImage?: Express.Multer.File[], proofFiles?: Express.Multer.File[] },
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        if (!files.coverImage || files.coverImage.length === 0)
            throw new BadRequestException('Vui lòng cung cấp ảnh bìa chiến dịch!');

        if (!files.proofFiles || files.proofFiles.length === 0)
            throw new BadRequestException('Vui lòng cung cấp ít nhất 1 ảnh/giấy tờ minh chứng!');


        if (dto.startDate >= dto.endDate)
            throw new BadRequestException('Ngày kết thúc phải lớn hơn ngày bắt đầu');

        const coverUrl = await this.cloudinaryService.uploadFile(
            files.coverImage[0],
            CloudinaryFolder.CAMPAIGN_PROOFS
        ).then(r => r.secure_url);

        const proofUploadPromises = files.proofFiles.map(file =>
            this.cloudinaryService.uploadFile(file, CloudinaryFolder.CAMPAIGN_PROOFS).then(r => r.secure_url)
        );

        const proofUrls = await Promise.all(proofUploadPromises);

        const combinedImageUrls = [coverUrl, ...proofUrls].join(',');

        const newCampaign = await this.campaignRepository.create({
            ...dto,
            status: CampaignStatus.PENDING,
            currentAmount: 0,
            imageUrls: combinedImageUrls,
            createdBy: { id: currentUser.id } as User
        });

        const savedCampaign = await this.campaignRepository.save(newCampaign);

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'VOLUNTEER',
            action: 'CREATE_CAMPAIGN',
            entity: 'CAMPAIGN',
            entityId: savedCampaign.id,
            before: null,
            after: {
                title: savedCampaign.title,
                description: savedCampaign.description,
                targetAmount: savedCampaign.targetAmount,
                campaignType: savedCampaign.campaignType,
                status: savedCampaign.status,
                currentAmount: savedCampaign.currentAmount,
                category: savedCampaign.category,
                imageUrls: savedCampaign.imageUrls,
                startDate: savedCampaign.startDate,
                endDate: savedCampaign.endDate,
                createdBy: currentUser.id,
            },
            metadata: {
                coverImageCount: files.coverImage?.length || 0,
                proofFileCount: files.proofFiles?.length || 0,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.INFO,
        });

        return savedCampaign;
    }

    async approveCampaign(
        campaignId: string,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const campaign = await this.findOne(campaignId);

        if (campaign.status !== CampaignStatus.PENDING) {
            throw new BadRequestException('Chiến dịch không ở trạng thái chờ duyệt');
        }

        const fundAccount = this.accountRepository.create({
            code: `CAMP_${campaign.id}_FUND`,
            accountType: AccountType.LIABILITY, // Vẫn là nợ phải trả cho cộng đồng
            name: `Quỹ Chiến dịch: ${campaign.title}`,
            balance: 0
        });

        await this.accountRepository.save(fundAccount);

        const before = {
            status: campaign.status,
            approvedBy: campaign.approvedBy?.id ?? null,
            rejectionReason: campaign.rejectionReason,
        };

        // Cập nhật trạng thái chiến dịch
        campaign.status = CampaignStatus.ACTIVE;
        campaign.approvedBy = { id: currentUser.id } as User;

        const savedCampaign = await this.campaignRepository.save(campaign);

        await this.searchService.syncCampaign(savedCampaign);

        await this.notificationService.sendNotification(
            campaign.createdBy.id,
            campaign.createdBy.email,
            'Chiến dịch đã được duyệt',
            `Chúc mừng! Chiến dịch "${campaign.title}" của bạn đã được Ban quản trị duyệt và bắt đầu nhận quyên góp.`,
            NotificationType.SUCCESS,
            `/campaigns/${campaign.id}/manage`,
            true
        );

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'ADMIN',
            action: 'APPROVE_CAMPAIGN',
            entity: 'CAMPAIGN',
            entityId: savedCampaign.id,
            before,
            after: {
                status: savedCampaign.status,
                approvedBy: currentUser.id,
                rejectionReason: savedCampaign.rejectionReason,
            },
            metadata: {
                title: savedCampaign.title,
                targetAmount: savedCampaign.targetAmount,
                fundAccountCode: fundAccount.code,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.WARN,
        });

        return { message: 'Đã duyệt chiến dịch và khởi tạo Quỹ thành công', campaign };
    }

    async rejectCampaign(
        campaignId: string,
        reason: string,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const campaign = await this.findOne(campaignId);
        if (campaign.status !== CampaignStatus.PENDING) {
            throw new BadRequestException('Chiến dịch không ở trạng thái chờ duyệt');
        }

        const before = {
            status: campaign.status,
            rejectionReason: campaign.rejectionReason,
            approvedBy: campaign.approvedBy?.id ?? null,
        };

        campaign.status = CampaignStatus.REJECTED;
        campaign.rejectionReason = reason;
        campaign.approvedBy = { id: currentUser.id } as User;

        const savedCampaign = await this.campaignRepository.save(campaign);

        await this.notificationService.sendNotification(
            campaign.createdBy.id,
            campaign.createdBy.email,
            'Chiến dịch bị từ chối',
            `Chiến dịch "${campaign.title}" của bạn đã bị từ chối. Lý do: ${reason}. Vui lòng cập nhật lại thông tin.`,
            NotificationType.WARNING,
            `/profile`,
            true
        );

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'ADMIN',
            action: 'REJECT_CAMPAIGN',
            entity: 'CAMPAIGN',
            entityId: savedCampaign.id,
            before,
            after: {
                status: savedCampaign.status,
                rejectionReason: savedCampaign.rejectionReason,
                approvedBy: currentUser.id,
            },
            metadata: {
                title: savedCampaign.title,
                reason,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.WARN,
        });

        return { message: 'Đã từ chối chiến dịch' };
    }

    async findAll(query: GetCampaignsQueryDto) {
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 10;
        const sort = query.sort === 'ASC' ? 'ASC' : 'DESC';
        const { status, keyword } = query;

        const skip = (page - 1) * limit;

        const qb = this.campaignRepository.createQueryBuilder('campaign')
            .leftJoin('campaign.createdBy', 'createdBy')
            .addSelect(['createdBy.id', 'createdBy.fullName'])
            .orderBy('campaign.createdAt', sort)
            .skip(skip)
            .take(limit);

        if (status) {
            qb.andWhere('campaign.status = :status', { status });
        }

        if (keyword && keyword.trim() !== '') {
            qb.andWhere(
                `(
                campaign.title ILIKE :keyword
                OR campaign.description ILIKE :keyword
                OR campaign.category ILIKE :keyword
                OR createdBy.fullName ILIKE :keyword
            )`,
                { keyword: `%${keyword.trim()}%` },
            );
        }

        const [data, total] = await qb.getManyAndCount();

        return {
            data,
            meta: {
                totalItems: total,
                itemCount: data.length,
                itemsPerPage: limit,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
            },
        };
    }

    async findOne(id: string) {
        const campaign = await this.campaignRepository.createQueryBuilder('campaign')
            .leftJoin('campaign.createdBy', 'createdBy')
            .leftJoin('campaign.approvedBy', 'approvedBy')
            .addSelect(['createdBy.id', 'createdBy.fullName'])
            .addSelect(['approvedBy.id', 'approvedBy.fullName'])
            .where('campaign.id = :id', { id })
            .getOne();
        if (!campaign) {
            throw new NotFoundException(`Không tìm thấy chiến dịch với ID: ${id}`);
        }
        return campaign;
    }

    async getUrgentCampaigns() {
        const qb = this.campaignRepository.createQueryBuilder('campaign')
            .leftJoin('campaign.createdBy', 'createdBy')
            .addSelect(['createdBy.id', 'createdBy.fullName'])
            .where('campaign.status = :status', { status: CampaignStatus.ACTIVE })
            .andWhere('campaign.endDate > :now', { now: new Date() })
            .orderBy('campaign.endDate', 'ASC')
            .take(6);

        const [data] = await qb.getManyAndCount();

        return data;
    }

    async getMyCampaigns(userId: string) {
        return this.campaignRepository.find({
            where: { createdBy: { id: userId } },
            order: { createdAt: 'DESC' },
        });
    }

    async updateStatus(
        id: string,
        updateDto: UpdateCampaignStatusDto,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const campaign = await this.findOne(id);

        const before = {
            status: campaign.status,
        };

        campaign.status = updateDto.status;

        const savedCampaign = await this.campaignRepository.save(campaign);

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'ADMIN',
            action: 'UPDATE_CAMPAIGN_STATUS',
            entity: 'CAMPAIGN',
            entityId: savedCampaign.id,
            before,
            after: {
                status: savedCampaign.status,
            },
            metadata: {
                title: savedCampaign.title,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.WARN,
        });

        return { message: 'Cập nhật trạng thái thành công', campaign: savedCampaign };
    }

    // ĐÓNG CHIẾN DỊCH & ĐIỀU CHUYỂN QUỸ
    async cancelAndReallocate(
        campaignId: string,
        reason: string,
        currentUser?: any,
        requestInfo?: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const campaign = await queryRunner.manager.findOne(Campaign, {
                where: { id: campaignId },
                lock: { mode: 'pessimistic_write' },
            });

            if (!campaign) {
                throw new NotFoundException('Không tìm thấy chiến dịch');
            }

            if (
                campaign.status === CampaignStatus.CLOSED ||
                campaign.status === CampaignStatus.REJECTED
            ) {
                throw new BadRequestException('Chiến dịch này đã đóng từ trước.');
            }

            const before = {
                status: campaign.status,
                currentAmount: campaign.currentAmount,
                rejectionReason: campaign.rejectionReason,
            };

            const campaignFundAccount = await queryRunner.manager.findOne(Account, {
                where: { code: `CAMP_${campaignId}_FUND` },
                lock: { mode: 'pessimistic_write' },
            });

            if (!campaignFundAccount) {
                throw new InternalServerErrorException(
                    'Lỗi: Không tìm thấy tài khoản quỹ của chiến dịch',
                );
            }

            const generalFund = await queryRunner.manager.findOne(Account, {
                where: { code: 'SYS_GENERAL_FUND' },
                lock: { mode: 'pessimistic_write' },
            });

            if (!generalFund) {
                throw new InternalServerErrorException(
                    'Lỗi: Không tìm thấy Quỹ dự phòng tổng',
                );
            }

            const amountToTransfer = Number(campaignFundAccount.balance || 0);

            if (amountToTransfer > 0) {
                await this.ledgerService.recordTransaction(
                    queryRunner.manager,
                    LedgerReferenceType.FUND_REALLOCATION,
                    campaign.id,
                    `Điều chuyển số dư còn lại của chiến dịch: ${campaign.title}`,
                    [
                        {
                            accountCode: `CAMP_${campaignId}_FUND`,
                            isDebit: true,
                            amount: amountToTransfer,
                        },
                        {
                            accountCode: 'SYS_GENERAL_FUND',
                            isDebit: false,
                            amount: amountToTransfer,
                        },
                    ],
                );
            }

            campaign.status = CampaignStatus.CLOSED;
            campaign.currentAmount = 0;
            campaign.rejectionReason = reason;

            const savedCampaign = await queryRunner.manager.save(campaign);
            await queryRunner.commitTransaction();

            await this.auditLogService.log({
                actorId: currentUser?.id ?? 'SYSTEM',
                actorEmail: currentUser?.email ?? null,
                actorRole: currentUser?.role?.name ?? 'SYSTEM',
                action: 'CANCEL_AND_REALLOCATE_CAMPAIGN',
                entity: 'CAMPAIGN',
                entityId: savedCampaign.id,
                before,
                after: {
                    status: savedCampaign.status,
                    currentAmount: savedCampaign.currentAmount,
                    rejectionReason: savedCampaign.rejectionReason,
                },
                metadata: {
                    title: savedCampaign.title,
                    reason,
                    amountToTransfer,
                    fromAccount: `CAMP_${campaignId}_FUND`,
                    toAccount: 'SYS_GENERAL_FUND',
                    referenceType: LedgerReferenceType.FUND_REALLOCATION,
                },
                ipAddress: requestInfo?.ipAddress ?? null,
                userAgent: requestInfo?.userAgent ?? null,
                status: AuditLogStatus.SUCCESS,
                severity: AuditLogSeverity.CRITICAL,
            });

            return {
                message: `Đã đóng chiến dịch và điều chuyển ${amountToTransfer}đ vào Quỹ dự phòng.`,
                amountToTransfer,
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async processExpiredCampaigns() {
        console.log(' Bắt đầu quét các chiến dịch hết hạn...');

        const expiredCampaigns = await this.campaignRepository.find({
            where: { endDate: LessThan(new Date()), status: CampaignStatus.ACTIVE }
        });

        for (const campaign of expiredCampaigns) {
            const isTargetReached = Number(campaign.currentAmount) >= Number(campaign.targetAmount);

            if (campaign.campaignType === 'FIXED' && !isTargetReached) {
                console.log(`[FIXED] Chiến dịch "${campaign.title}" thất bại. Tiến hành điều chuyển quỹ...`);

                try {
                    await this.cancelAndReallocate(
                        campaign.id,
                        'HỆ THỐNG TỰ ĐỘNG: Đóng chiến dịch và điều chuyển quỹ do hết hạn nhưng không đạt mục tiêu (FIXED).',
                        {
                            id: 'SYSTEM',
                            email: null,
                            role: { name: 'SYSTEM' },
                        },
                        {
                            ipAddress: null,
                            userAgent: 'CRON_JOB',
                        },
                    );
                    console.log(` Đã điều chuyển thành công quỹ của chiến dịch ${campaign.id}`);
                } catch (error) {
                    console.error(` Lỗi khi tự động điều chuyển quỹ chiến dịch ${campaign.id}:`, error);
                }

            } else {
                // FLEXIBLE (Linh hoạt) hoặc FIXED đã đủ tiền -> Cho phép chốt sổ để giải ngân
                console.log(`[${campaign.campaignType}] Chiến dịch "${campaign.title}" thành công. Chuyển sang COMPLETED.`);

                const before = {
                    status: campaign.status,
                };

                const savedCampaign = await this.campaignRepository.save(campaign);

                await this.auditLogService.log({
                    actorId: 'SYSTEM',
                    actorEmail: null,
                    actorRole: 'SYSTEM',
                    action: 'AUTO_COMPLETE_EXPIRED_CAMPAIGN',
                    entity: 'CAMPAIGN',
                    entityId: savedCampaign.id,
                    before,
                    after: {
                        status: savedCampaign.status,
                    },
                    metadata: {
                        title: savedCampaign.title,
                        campaignType: savedCampaign.campaignType,
                        currentAmount: savedCampaign.currentAmount,
                        targetAmount: savedCampaign.targetAmount,
                        reason: 'Campaign expired and target condition satisfied',
                    },
                    ipAddress: null,
                    userAgent: 'CRON_JOB',
                    status: AuditLogStatus.SUCCESS,
                    severity: AuditLogSeverity.WARN,
                });
            }
        }
        console.log(' Hoàn tất quét chiến dịch hết hạn.');
    }
}
