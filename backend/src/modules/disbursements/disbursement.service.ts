import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Disbursement } from './entities/disbursement.entity';
import { DisbursementProof } from './entities/disbursement-proof.entity';
import { CloudinaryFolder, CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { DataSource, Repository } from 'typeorm';
import { AuditProofDto, CreateDisbursementDto, DisbursementStatus, FlagResolutionAction, ProofStatus, ResolveFlagDto, TransferDisbursementDto } from './dto/disbursement.dto';
import { LedgerService } from '../ledger/ledger.service';
import { ConfigService } from '@nestjs/config';
import { Account } from '../ledger/entities/account.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignStatus } from '../campaigns/dto/campaign.dto';
import { LedgerReferenceType } from '../ledger/dto/ledger.dto';

import * as crypto from 'crypto';
import { User } from '../users/entities/user.entity';
import axios from 'axios';
import { NotificationService } from '../system/notification.service';
import { NotificationType } from '../system/entities/notification.entity';
import { AuditLogService } from '../audit/audit-log.service';
import { AuditLogSeverity, AuditLogStatus } from '../audit/dto/create-audit-log.dto';

@Injectable()
export class DisbursementService {
    private readonly logger = new Logger(DisbursementService.name);

    constructor(
        @InjectRepository(Disbursement) private disbursementRepository: Repository<Disbursement>,
        @InjectRepository(DisbursementProof) private proofRepository: Repository<DisbursementProof>,
        @InjectRepository(Campaign) private campaignRepository: Repository<Campaign>,
        @InjectRepository(User) private userRepository: Repository<User>,
        private cloudinaryService: CloudinaryService,
        private dataSource: DataSource,
        private readonly ledgerService: LedgerService,
        private readonly notificationService: NotificationService,
        private readonly configService: ConfigService,
        private readonly auditLogService: AuditLogService,
    ) { }

    async createDisbursementRequest(
        campaignId: string,
        currentUser: any,
        dto: CreateDisbursementDto,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const volunteerId = currentUser.id;

        const campaign = await this.campaignRepository.findOne({
            where: { id: campaignId }, relations: ['createdBy']
        });

        if (!campaign || campaign.status !== CampaignStatus.ACTIVE) throw new BadRequestException('Chiến dịch không hợp lệ');
        if (campaign.createdBy.id !== volunteerId) throw new ForbiddenException('Chỉ chủ chiến dịch mới được rút tiền');

        const unclearedDisbursements = await this.disbursementRepository.find({
            where: {
                volunteer: { id: volunteerId },
                status: DisbursementStatus.TRANSFERRED
            },
            relations: ['proofs']
        });

        for (const d of unclearedDisbursements) {
            // Nếu đợt đó chưa up ảnh nào, hoặc có ảnh nhưng trạng thái chưa phải là VERIFIED (hợp lệ)
            const isNotCleared = d.proofs.length === 0 || d.proofs.some(p => p.verificationStatus !== ProofStatus.VERIFIED);
            if (isNotCleared) {
                throw new BadRequestException(
                    `Tài khoản bị khóa chức năng rút tiền! Đợt giải ngân trước đó của bạn (${d.title}) chưa hoàn tất quyết toán hóa đơn hợp lệ.`
                );
            }
        }

        const user = await this.userRepository.findOne({ where: { id: volunteerId } });

        if (!user?.bankName || !user?.bankAccountNumber || !user?.bankAccountName) {
            throw new BadRequestException('Vui lòng cập nhật Thông tin thanh toán trong Profile trước khi xin giải ngân!');
        }

        const fundAccount = await this.dataSource.manager.findOne(Account, {
            where: { code: `CAMP_${campaignId}_FUND` },
        });

        if (!fundAccount) {
            throw new BadRequestException('Không tìm thấy tài khoản quỹ của chiến dịch.');
        }

        // Check số dư an toàn (Trừ đi các khoản đang treo chờ duyệt/chờ chuyển)
        const pendingDisbursements = await this.disbursementRepository.find({
            where: [
                { campaign: { id: campaignId }, status: DisbursementStatus.PENDING_APPROVAL },
                { campaign: { id: campaignId }, status: DisbursementStatus.PENDING_TRANSFER }
            ]
        });

        const lockedAmount = pendingDisbursements.reduce((sum, d) => sum + Number(d.amount), 0);
        const availableAmount = Number(fundAccount.balance) - lockedAmount;

        if (dto.amount > availableAmount) {
            throw new BadRequestException('Quỹ chiến dịch không đủ hoặc đang có khoản treo chưa xử lý.');
        }

        const disbursement = this.disbursementRepository.create({
            campaign: { id: campaignId },
            volunteer: { id: volunteerId },
            title: dto.title,
            amount: dto.amount,
            purpose: dto.purpose,
            bankName: user.bankName,
            bankAccountNumber: user.bankAccountNumber,
            bankAccountName: user.bankAccountName,
            status: DisbursementStatus.PENDING_APPROVAL
        });

        const savedDisbursement = await this.disbursementRepository.save(disbursement);

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'VOLUNTEER',
            action: 'CREATE_DISBURSEMENT_REQUEST',
            entity: 'DISBURSEMENT',
            entityId: savedDisbursement.id,
            before: null,
            after: {
                campaignId,
                volunteerId: currentUser.id,
                title: savedDisbursement.title,
                amount: savedDisbursement.amount,
                purpose: savedDisbursement.purpose,
                status: savedDisbursement.status,
            },
            metadata: {
                campaignTitle: campaign.title,
                availableAmount,
                lockedAmount,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.WARN,
        });

        await this.notificationService.notifyUsersByRole(
            ['ADMIN', 'SUPER_ADMIN'],
            'Yêu cầu giải ngân mới',
            `Tình nguyện viên ${user.fullName} vừa xin rút ${Number(dto.amount).toLocaleString('vi-VN')}đ cho chiến dịch "${campaign.title}".`,
            NotificationType.INFO,
            `/admin/disbursements`
        );

        return savedDisbursement;
    }

    async approveOrRejectRequest(
        disbursementId: string,
        isApproved: boolean,
        reason: string | undefined,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const disbursement = await this.disbursementRepository.findOne({
            where: { id: disbursementId },
            relations: ['campaign', 'volunteer', 'approvedBy'],
        });

        if (!disbursement) throw new NotFoundException('Không tìm thấy phiếu yêu cầu');
        if (disbursement.status !== DisbursementStatus.PENDING_APPROVAL) throw new BadRequestException('Phiếu này không ở trạng thái chờ duyệt');

        const before = {
            status: disbursement.status,
            rejectionReason: disbursement.rejectionReason,
            approvedBy: disbursement.approvedBy?.id ?? null,
        };


        if (!isApproved) {
            if (!reason) throw new BadRequestException('Cần nhập lý do từ chối');

            disbursement.status = DisbursementStatus.REJECTED;
            disbursement.rejectionReason = reason;
            disbursement.approvedBy = { id: currentUser.id } as User;

            await this.notificationService.sendNotification(
                disbursement.volunteer.id,
                disbursement.volunteer.email,
                'Yêu cầu rút tiền bị từ chối',
                `Phiếu yêu cầu giải ngân "${disbursement.title}" đã bị từ chối. Lý do: ${reason}`,
                NotificationType.WARNING,
                `/campaigns/${disbursement.campaign.id}/manage`,
                true
            );
        } else {
            disbursement.status = DisbursementStatus.PENDING_TRANSFER; // Chuyển qua cho kế toán ck
            disbursement.approvedBy = { id: currentUser.id } as User;
        }

        const savedDisbursement = await this.disbursementRepository.save(disbursement);

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'ADMIN',
            action: isApproved ? 'APPROVE_DISBURSEMENT_REQUEST' : 'REJECT_DISBURSEMENT_REQUEST',
            entity: 'DISBURSEMENT',
            entityId: savedDisbursement.id,
            before,
            after: {
                status: savedDisbursement.status,
                rejectionReason: savedDisbursement.rejectionReason,
                approvedBy: currentUser.id,
            },
            metadata: {
                campaignId: disbursement.campaign.id,
                volunteerId: disbursement.volunteer.id,
                title: disbursement.title,
                amount: disbursement.amount,
                reason: reason ?? null,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.WARN,
        });

        return { message: isApproved ? 'Đã duyệt, chờ Kế toán chuyển khoản' : 'Đã từ chối phiếu yêu cầu' };
    }

    async confirmTransfer(
        disbursementId: string,
        dto: TransferDisbursementDto,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const disbursement = await queryRunner.manager.findOne(Disbursement, {
                where: { id: disbursementId },
                relations: ['campaign', 'volunteer', 'approvedBy']
            });

            if (!disbursement) throw new NotFoundException('Không tìm thấy phiếu giải ngân');
            if (disbursement.status !== DisbursementStatus.PENDING_TRANSFER) {
                throw new BadRequestException('Phiếu này đã được chuyển tiền hoặc không hợp lệ');
            }

            const campaign = await queryRunner.manager.findOne(Campaign, {
                where: { id: disbursement.campaign.id },
                lock: { mode: 'pessimistic_write' }
            });
            if (!campaign) {
                throw new NotFoundException('Chiến dịch này không tồn tại');
            }

            const before = {
                status: disbursement.status,
                txReference: disbursement.txReference,
            };

            // LẤY TÀI KHOẢN TỔNG TỪ DATABASE BẰNG MÃ 'SYS_BANK_MAIN'
            const cashAccount = await queryRunner.manager.findOne(Account, {
                where: { code: 'SYS_BANK_MAIN' }
            });

            if (!cashAccount) {
                throw new InternalServerErrorException('Lỗi nghiêm trọng: Không tìm thấy tài khoản ngân hàng tổng (SYS_BANK_MAIN)');
            }

            // 2. Cập nhật phiếu giải ngân
            disbursement.status = DisbursementStatus.TRANSFERRED;
            disbursement.txReference = dto.txReference;
            await queryRunner.manager.save(disbursement);

            // 3. TÍCH HỢP INTERNAL LEDGER: Ghi nhận bút toán xuất tiền
            await this.ledgerService.recordDisbursement(
                queryRunner.manager,
                campaign.id,
                disbursement.amount,
                disbursement.id,
                `Giải ngân cho phiếu ${disbursement.id}`
            );

            // 4. Trừ tiền hiển thị ở Campaign
            // campaign.currentAmount = Number(campaign.currentAmount) - Number(disbursement.amount);
            // await queryRunner.manager.save(campaign);

            await queryRunner.commitTransaction();

            await this.auditLogService.log({
                actorId: currentUser.id,
                actorEmail: currentUser.email,
                actorRole: currentUser.role?.name || 'ADMIN',
                action: 'CONFIRM_DISBURSEMENT_TRANSFER',
                entity: 'DISBURSEMENT',
                entityId: disbursement.id,
                before,
                after: {
                    status: DisbursementStatus.TRANSFERRED,
                    txReference: dto.txReference,
                },
                metadata: {
                    campaignId: campaign.id,
                    volunteerId: disbursement.volunteer?.id ?? null,
                    amount: disbursement.amount,
                    referenceType: LedgerReferenceType.DISBURSEMENT,
                    txReference: dto.txReference,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                status: AuditLogStatus.SUCCESS,
                severity: AuditLogSeverity.CRITICAL,
            });

            try {
                // Kiểm tra xem volunteer có tồn tại không trước khi gọi để tránh lỗi Null Pointer
                if (disbursement.volunteer && disbursement.volunteer.email) {
                    await this.notificationService.sendNotification(
                        disbursement.volunteer.id,
                        disbursement.volunteer.email,
                        'Giải ngân thành công!',
                        `Tiền giải ngân đợt "${disbursement.title}" đã được chuyển khoản. Mã đối soát: ${dto.txReference}. Vui lòng tải hóa đơn lên hệ thống trong thời gian sớm nhất!`,
                        NotificationType.SUCCESS,
                        `/campaigns/${campaign.id}/manage`,
                        true
                    );
                }
            } catch (notifyError) {
                // Chỉ log ra lỗi chứ KHÔNG THROW, để API vẫn trả về Status 200 (Thành công)
                this.logger.error(`Lỗi gửi thông báo cho phiếu giải ngân ${disbursementId}: ${notifyError.message}`);
            }

            return { message: 'Xác nhận chuyển tiền thành công. Đã trừ quỹ chiến dịch.' };

        } catch (error) {
            if (queryRunner.isTransactionActive) {
                await queryRunner.rollbackTransaction();
            }
            throw error;
        } finally {
            if (!queryRunner.isReleased) {
                await queryRunner.release();
            }
        }
    }

    // 2. TNV UPLOAD HÓA ĐƠN CHỨNG TỪ
    async uploadProofs(
        disbursementId: string,
        currentUser: any,
        files: Express.Multer.File[],
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        if (!files || files.length === 0) throw new BadRequestException('Vui lòng tải lên hình ảnh hóa đơn');

        const disbursement = await this.disbursementRepository.findOne({
            where: { id: disbursementId },
            relations: ['campaign', 'volunteer']
        });

        if (!disbursement)
            throw new NotFoundException('Không tìm thấy phiếu giải ngân');

        if (disbursement.volunteer.id !== currentUser.id)
            throw new ForbiddenException('Bạn không có quyền upload chứng từ cho giao dịch này');

        if (disbursement.status !== DisbursementStatus.TRANSFERRED)
            throw new BadRequestException('Khoản tiền này chưa được chuyển, không thể upload chứng từ');

        const proofsToSave: DisbursementProof[] = [];

        for (const file of files) {
            const uploadResult = await this.cloudinaryService.uploadFile(
                file,
                CloudinaryFolder.DISBURSEMENT_PROOFS,
            );

            const response = await axios.get(uploadResult.secure_url, {
                responseType: 'arraybuffer',
            });

            const cloudinaryFileBuffer = Buffer.from(response.data);

            const fileHash = crypto
                .createHash('sha256')
                .update(cloudinaryFileBuffer)
                .digest('hex');

            const hmacSignature = this.createProofSignature(
                fileHash,
                currentUser.id,
                disbursementId,
            );

            const newProof = this.proofRepository.create({
                disbursement: { id: disbursementId },
                fileUrl: uploadResult.secure_url,
                hmacSignature,
                verificationStatus: ProofStatus.PENDING_AUDIT,
            });

            proofsToSave.push(newProof);
        }

        const savedProofs = await this.proofRepository.save(proofsToSave);

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'VOLUNTEER',
            action: 'UPLOAD_DISBURSEMENT_PROOFS',
            entity: 'DISBURSEMENT',
            entityId: disbursement.id,
            before: null,
            after: {
                proofIds: savedProofs.map(p => p.id),
                proofCount: savedProofs.length,
                verificationStatus: ProofStatus.PENDING_AUDIT,
                hasHmacSignature: true,
            },
            metadata: {
                campaignId: disbursement.campaign.id,
                title: disbursement.title,
                amount: disbursement.amount,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: AuditLogSeverity.WARN,
        });

        await this.notificationService.notifyUsersByRole(
            ['AUDITOR'],
            'Có chứng từ mới cần kiểm toán',
            `Chiến dịch "${disbursement.campaign.title}" vừa cập nhật hóa đơn giải ngân. Vui lòng vào tra soát.`,
            NotificationType.INFO,
            `/auditor/proofs`
        );

        return { message: 'Tải lên chứng từ thành công, chờ kiểm toán.' };
    }

    // 3. KIỂM TOÁN VIÊN (AUDITOR) ĐÁNH GIÁ CHỨNG TỪ
    async auditProof(
        proofId: string,
        dto: AuditProofDto,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const proof = await this.proofRepository.findOne({
            where: { id: proofId },
            relations: [
                'disbursement',
                'disbursement.volunteer',
                'disbursement.campaign'
            ]
        });
        if (!proof) throw new NotFoundException('Không tìm thấy chứng từ');

        const before = {
            verificationStatus: proof.verificationStatus,
            flaggedReason: proof.flaggedReason,
        };

        proof.verificationStatus = dto.verificationStatus;

        if (dto.verificationStatus === ProofStatus.FLAGGED) {
            if (!dto.flaggedReason) throw new BadRequestException('Phải nhập lý do đánh dấu gian lận');
            proof.flaggedReason = dto.flaggedReason;
        } else {
            proof.flaggedReason = null; // Xóa lý do nếu chuyển lại thành Verified
        }

        const savedProof = await this.proofRepository.save(proof);

        await this.auditLogService.log({
            actorId: currentUser.id,
            actorEmail: currentUser.email,
            actorRole: currentUser.role?.name || 'AUDITOR',
            action: 'AUDIT_DISBURSEMENT_PROOF',
            entity: 'DISBURSEMENT_PROOF',
            entityId: savedProof.id,
            before,
            after: {
                verificationStatus: savedProof.verificationStatus,
                flaggedReason: savedProof.flaggedReason,
            },
            metadata: {
                disbursementId: proof.disbursement.id,
                campaignId: proof.disbursement.campaign.id,
                volunteerId: proof.disbursement.volunteer.id,
            },
            ipAddress: requestInfo.ipAddress,
            userAgent: requestInfo.userAgent,
            status: AuditLogStatus.SUCCESS,
            severity: dto.verificationStatus === ProofStatus.FLAGGED
                ? AuditLogSeverity.CRITICAL
                : AuditLogSeverity.WARN,
        });

        if (dto.verificationStatus === ProofStatus.FLAGGED) {
            // 1. Cảnh cáo TNV
            await this.notificationService.sendNotification(
                proof.disbursement.volunteer.id,
                proof.disbursement.volunteer.email,
                'Hóa đơn bị cảnh báo',
                `Kiểm toán viên phát hiện dấu hiệu bất thường trên hóa đơn của bạn: "${dto.flaggedReason}". Ban quản trị sẽ tiến hành phán xử.`,
                NotificationType.WARNING,
                `/campaigns/${proof.disbursement.campaign.id}/manage`,
                true
            );
            // 2. Báo khẩn cấp cho Super Admin vào phán xử
            await this.notificationService.notifyUsersByRole(
                ['SUPER_ADMIN'],
                'PHÁT HIỆN HÓA ĐƠN CÓ VẤN ĐỀ',
                `Kiểm toán viên vừa cắm cờ 1 hóa đơn thuộc đợt giải ngân "${proof.disbursement.title}". Vui lòng vào phán xử!`,
                NotificationType.URGENT,
                `/admin/disbursements`,
                true // Bắn email cho sếp
            );
        } else if (dto.verificationStatus === ProofStatus.VERIFIED) {
            // Báo cho TNV yên tâm
            await this.notificationService.sendNotification(
                proof.disbursement.volunteer.id,
                proof.disbursement.volunteer.email,
                'Hóa đơn hợp lệ',
                `Hóa đơn đợt "${proof.disbursement.title}" của bạn đã qua vòng kiểm toán thành công.`,
                NotificationType.SUCCESS,
                `/campaigns/${proof.disbursement.campaign.id}/manage`
            );
        }

        return { message: `Đã kiểm toán chứng từ: ${dto.verificationStatus}` };
    }

    async verifyProofSignature(
        proofId: string,
        currentUser: any,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const proof = await this.proofRepository.findOne({
            where: { id: proofId },
            relations: ['disbursement', 'disbursement.volunteer']
        });

        if (!proof) throw new NotFoundException('Không tìm thấy chứng từ');

        const before = {
            verificationStatus: proof.verificationStatus,
            flaggedReason: proof.flaggedReason,
        };

        try {
            const response = await axios.get(proof.fileUrl, {
                responseType: 'arraybuffer',
            });

            const fileBuffer = Buffer.from(response.data);

            const currentFileHash = crypto
                .createHash('sha256')
                .update(fileBuffer)
                .digest('hex');

            const expectedSignature = this.createProofSignature(
                currentFileHash,
                proof.disbursement.volunteer.id,
                proof.disbursement.id,
            );

            let isValid = false;

            if (
                proof.hmacSignature &&
                expectedSignature.length === proof.hmacSignature.length
            ) {
                isValid = crypto.timingSafeEqual(
                    Buffer.from(expectedSignature, 'hex'),
                    Buffer.from(proof.hmacSignature, 'hex'),
                );
            }

            if (!isValid) {
                proof.verificationStatus = ProofStatus.FLAGGED;
                proof.flaggedReason =
                    'HỆ THỐNG TỰ ĐỘNG: Phát hiện ảnh gốc trên máy chủ đã bị thay đổi trái phép (Chữ ký không khớp).';

                await this.proofRepository.save(proof);
            }

            try {
                await this.auditLogService.log({
                    actorId: currentUser.id,
                    actorEmail: currentUser.email,
                    actorRole: currentUser.role?.name || 'AUDITOR',
                    action: 'VERIFY_PROOF_SIGNATURE',
                    entity: 'DISBURSEMENT_PROOF',
                    entityId: proof.id,
                    before,
                    after: {
                        verificationStatus: proof.verificationStatus,
                        flaggedReason: proof.flaggedReason,
                        signatureValid: isValid,
                    },
                    metadata: {
                        disbursementId: proof.disbursement.id,
                        volunteerId: proof.disbursement.volunteer.id,
                    },
                    ipAddress: requestInfo.ipAddress,
                    userAgent: requestInfo.userAgent,
                    status: AuditLogStatus.SUCCESS,
                    severity: isValid ? AuditLogSeverity.INFO : AuditLogSeverity.CRITICAL,
                });
            } catch (auditError) {
                this.logger.error(
                    `Không thể ghi audit log verify proof ${proof.id}: ${auditError.message}`,
                );
            }

            return {
                isValid,
                message: isValid
                    ? 'Tệp tin nguyên vẹn, chữ ký hợp lệ.'
                    : 'Phát hiện tệp tin bị giả mạo!',
            };
        } catch (error) {
            this.logger.error(`Lỗi xác minh chữ ký proof ${proofId}: ${error.message}`);
            throw new InternalServerErrorException('Không thể xác minh chữ ký chứng từ.');
        }
    }

    async getDisbursementsByCampaign(campaignId: string) {
        return this.disbursementRepository.find({
            where: {
                campaign: { id: campaignId }
            },
            relations: ['proofs'],
            order: { createdAt: 'DESC' }
        });
    }

    async findAllForAdmin(query: any) {
        const { page = 1, limit = 10, status } = query;
        const skip = (page - 1) * limit;

        const qb = this.disbursementRepository.createQueryBuilder('disb')
            .leftJoinAndSelect('disb.campaign', 'campaign')
            .leftJoin('disb.volunteer', 'volunteer')
            .addSelect(['volunteer.id', 'volunteer.fullName', 'volunteer.bankName', 'volunteer.bankAccountNumber', 'volunteer.bankAccountName'])
            .leftJoinAndSelect('disb.proofs', 'proofs')
            .leftJoin('disb.approvedBy', 'approvedBy')
            .addSelect(['approvedBy.id', 'approvedBy.fullName'])
            .orderBy('disb.createdAt', 'DESC')
            .skip(skip)
            .take(limit);

        if (status) {
            if (status === 'NO_PROOF') {
                qb.andWhere('disb.status = :transferred', {
                    transferred: DisbursementStatus.TRANSFERRED,
                });
                qb.andWhere('proofs.id IS NULL');
            } else if (status === 'FLAGGED_PROOF') {
                qb.andWhere('disb.status = :transferred', {
                    transferred: DisbursementStatus.TRANSFERRED,
                });
                qb.andWhere('proofs.verificationStatus = :proofStatus', {
                    proofStatus: ProofStatus.FLAGGED,
                });
            } else if (status === 'REJECTED_PROOF') {
                qb.andWhere('disb.status = :transferred', {
                    transferred: DisbursementStatus.TRANSFERRED,
                });
                qb.andWhere('proofs.verificationStatus = :proofStatus', {
                    proofStatus: ProofStatus.REJECTED,
                });
            } else if (status) {
                qb.andWhere('disb.status = :status', { status });
            }
        }

        const [data, total] = await qb.getManyAndCount();

        return {
            data,
            meta: {
                totalItems: total,
                itemCount: data.length,
                itemsPerPage: Number(limit),
                totalPages: Math.ceil(total / limit),
                currentPage: Number(page),
            },
        };
    }

    async getPublicTransparency(campaignId: string) {
        const disbursements = await this.disbursementRepository.find({
            where: {
                campaign: { id: campaignId },
                status: DisbursementStatus.TRANSFERRED
            },
            relations: ['proofs'],
            order: { createdAt: 'DESC' }
        });

        return disbursements.map(d => ({
            ...d,
            proofs: d.proofs.filter(p => p.verificationStatus === ProofStatus.VERIFIED)
        }));
    }

    // 4. SUPER ADMIN / QUẢN TRỊ VIÊN XỬ LÝ CHỨNG TỪ BỊ ĐÁNH CỜ (FLAGGED)
    async resolveFlaggedProof(
        proofId: string,
        currentUser: any,
        dto: ResolveFlagDto,
        requestInfo: { ipAddress?: string | null; userAgent?: string | null },
    ) {
        const proof = await this.proofRepository.findOne({
            where: { id: proofId },
            relations: [
                'disbursement',
                'disbursement.campaign',
                'disbursement.volunteer',
            ],
        });

        if (!proof) throw new NotFoundException('Không tìm thấy chứng từ');
        if (proof.verificationStatus !== ProofStatus.FLAGGED) {
            throw new BadRequestException('Chứng từ này không ở trạng thái bị cảnh báo (FLAGGED)');
        }

        const before = {
            proofStatus: proof.verificationStatus,
            flaggedReason: proof.flaggedReason,
            resolutionNote: proof.resolutionNote,
            campaignStatus: proof.disbursement.campaign.status,
        };

        proof.resolvedBy = currentUser.id;
        proof.resolutionNote = dto.resolutionNote;

        if (dto.action === FlagResolutionAction.OVERRIDE_ACCEPT) {
            // Trường hợp 1: Admin thấy hóa đơn hợp lệ, Auditor đánh cờ sai -> Gỡ cờ
            proof.verificationStatus = ProofStatus.VERIFIED;
            proof.flaggedReason = `${proof.flaggedReason} | [ADMIN OVERRIDE]: Đã gỡ cờ.`;
            await this.proofRepository.save(proof);

            await this.notificationService.sendNotification(
                proof.disbursement.volunteer.id,
                proof.disbursement.volunteer.email,
                'Đã gỡ cảnh báo hóa đơn',
                `Ban quản trị đã xem xét và xác nhận hóa đơn của bạn là Hợp Lệ. Lệnh cắm cờ đã được gỡ bỏ.`,
                NotificationType.SUCCESS,
                `/campaigns/${proof.disbursement.campaign.id}/manage`
            );

            await this.auditLogService.log({
                actorId: currentUser.id,
                actorEmail: currentUser.email,
                actorRole: currentUser.role?.name || 'SUPER_ADMIN',
                action: 'RESOLVE_FLAGGED_PROOF_OVERRIDE_ACCEPT',
                entity: 'DISBURSEMENT_PROOF',
                entityId: proof.id,
                before,
                after: {
                    proofStatus: proof.verificationStatus,
                    flaggedReason: proof.flaggedReason,
                    resolutionNote: proof.resolutionNote,
                    resolvedBy: currentUser.id,
                },
                metadata: {
                    disbursementId: proof.disbursement.id,
                    campaignId: proof.disbursement.campaign.id,
                    action: dto.action,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                status: AuditLogStatus.SUCCESS,
                severity: AuditLogSeverity.CRITICAL,
            });

            return { message: 'Đã phủ quyết Auditor. Chứng từ được công nhận Hợp lệ.' };

        } else if (dto.action === FlagResolutionAction.CONFIRM_FRAUD) {
            // Trường hợp 2: Admin xác nhận TNV gian lận (Làm giả hóa đơn)
            proof.verificationStatus = ProofStatus.REJECTED;
            await this.proofRepository.save(proof);

            // Bổ sung: Khóa chiến dịch khẩn cấp để điều tra
            const campaign = proof.disbursement.campaign;
            campaign.status = CampaignStatus.SUSPENDED;
            await this.campaignRepository.save(campaign);

            await this.notificationService.sendNotification(
                proof.disbursement.volunteer.id,
                proof.disbursement.volunteer.email,
                'ĐÌNH CHỈ CHIẾN DỊCH (GIAN LẬN)',
                `Chiến dịch "${proof.disbursement.campaign.title}" đã bị khóa do Ban quản trị xác nhận hành vi làm giả hóa đơn. Mọi giao dịch bị đình chỉ!`,
                NotificationType.URGENT,
                '',
                true // Ép bắn email đỏ
            );

            await this.auditLogService.log({
                actorId: currentUser.id,
                actorEmail: currentUser.email,
                actorRole: currentUser.role?.name || 'SUPER_ADMIN',
                action: 'RESOLVE_FLAGGED_PROOF_CONFIRM_FRAUD',
                entity: 'DISBURSEMENT_PROOF',
                entityId: proof.id,
                before,
                after: {
                    proofStatus: proof.verificationStatus,
                    flaggedReason: proof.flaggedReason,
                    resolutionNote: proof.resolutionNote,
                    resolvedBy: currentUser.id,
                    campaignStatus: campaign.status,
                },
                metadata: {
                    disbursementId: proof.disbursement.id,
                    campaignId: campaign.id,
                    campaignTitle: campaign.title,
                    action: dto.action,
                },
                ipAddress: requestInfo.ipAddress,
                userAgent: requestInfo.userAgent,
                status: AuditLogStatus.SUCCESS,
                severity: AuditLogSeverity.CRITICAL,
            });

            return { message: 'Đã xác nhận GIAN LẬN. Hủy chứng từ và Tạm khóa Chiến dịch.' };
        }
    }

    private getSignatureSecret(): string {
        const secret = this.configService.get<string>('SIGNATURE_SECRET');

        if (!secret) {
            throw new InternalServerErrorException('SIGNATURE_SECRET chưa được cấu hình');
        }

        return secret;
    }

    private createProofSignature(
        fileHash: string,
        volunteerId: string,
        disbursementId: string,
    ): string {
        const secret = this.getSignatureSecret();

        return crypto
            .createHmac('sha256', secret)
            .update(`${fileHash}-${volunteerId}-${disbursementId}`)
            .digest('hex');
    }
}
