import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Disbursement } from './entities/disbursement.entity';
import { DisbursementProof } from './entities/disbursement-proof.entity';
import { CloudinaryFolder, CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { DataSource, Repository } from 'typeorm';
import { AuditProofDto, DisbursementStatus, ProofStatus, TransferDisbursementDto } from './dto/disbursement.dto';
import { LedgerService } from '../ledger/ledger.service';
import { ConfigService } from '@nestjs/config';
import { Account } from '../ledger/entities/account.entity';
import { Campaign } from '../campaigns/entities/campaign.entity';
import { CampaignStatus } from '../campaigns/dto/campaign.dto';
import { LedgerReferenceType } from '../ledger/dto/ledger.dto';

@Injectable()
export class DisbursementService {
    constructor(
        @InjectRepository(Disbursement) private disbursementRepository: Repository<Disbursement>,
        @InjectRepository(DisbursementProof) private proofRepository: Repository<DisbursementProof>,
        @InjectRepository(Campaign) private campaignRepository: Repository<Campaign>,
        private cloudinaryService: CloudinaryService,
        private dataSource: DataSource,
        private readonly ledgerService: LedgerService,
        private readonly configService: ConfigService,
    ) { }

    async createDisbursementRequest(campaignId: string, volunteerId: string, amount: number, purpose: string) {
        const campaign = await this.campaignRepository.findOne({
            where: { id: campaignId }, relations: ['createdBy']
        });

        if (!campaign || campaign.status !== CampaignStatus.ACTIVE) throw new BadRequestException('Chiến dịch không hợp lệ');
        if (campaign.createdBy.id !== volunteerId) throw new ForbiddenException('Chỉ chủ chiến dịch mới được rút tiền');

        // Check số dư an toàn (Trừ đi các khoản đang treo chờ duyệt/chờ chuyển)
        const pendingDisbursements = await this.disbursementRepository.find({
            where: [
                { campaign: { id: campaignId }, status: DisbursementStatus.PENDING_APPROVAL },
                { campaign: { id: campaignId }, status: DisbursementStatus.PENDING_TRANSFER }
            ]
        });

        const lockedAmount = pendingDisbursements.reduce((sum, d) => sum + Number(d.amount), 0);
        const availableAmount = Number(campaign.currentAmount) - lockedAmount;

        if (amount > availableAmount) {
            throw new BadRequestException('Quỹ chiến dịch không đủ hoặc đang có khoản treo chưa xử lý.');
        }

        const disbursement = this.disbursementRepository.create({
            campaign: { id: campaignId },
            volunteer: { id: volunteerId },
            amount,
            purpose,
            status: DisbursementStatus.PENDING_APPROVAL
        });

        return await this.disbursementRepository.save(disbursement);
    }

    async approveOrRejectRequest(disbursementId: string, isApproved: boolean, reason?: string) {
        const disbursement = await this.disbursementRepository.findOne({ where: { id: disbursementId } });
        if (!disbursement) throw new NotFoundException('Không tìm thấy phiếu yêu cầu');
        if (disbursement.status !== DisbursementStatus.PENDING_APPROVAL) throw new BadRequestException('Phiếu này không ở trạng thái chờ duyệt');

        if (!isApproved) {
            if (!reason) throw new BadRequestException('Cần nhập lý do từ chối');
            disbursement.status = DisbursementStatus.REJECTED;
            disbursement.rejectionReason = reason;
        } else {
            disbursement.status = DisbursementStatus.PENDING_TRANSFER; // Chuyển qua cho kế toán ck
        }

        await this.disbursementRepository.save(disbursement);
        return { message: isApproved ? 'Đã duyệt, chờ Kế toán chuyển khoản' : 'Đã từ chối phiếu yêu cầu' };
    }

    async confirmTransfer(disbursementId: string, dto: TransferDisbursementDto) {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const disbursement = await queryRunner.manager.findOne(Disbursement, {
                where: { id: disbursementId },
                relations: ['campaign']
            });

            if (!disbursement) throw new NotFoundException('Không tìm thấy phiếu giải ngân');
            if (disbursement.status !== DisbursementStatus.PENDING_TRANSFER) {
                throw new BadRequestException('Phiếu này đã được chuyển tiền hoặc không hợp lệ');
            }

            // Kiểm tra xem quỹ chiến dịch có tài khoản kế toán chưa
            if (!disbursement.campaign.fundAccountId) {
                throw new InternalServerErrorException('Chiến dịch này chưa được cấp Tài khoản Quỹ');
            }

            // 1. Trừ tiền trực tiếp vào quỹ của chiến dịch
            const campaign = disbursement.campaign;
            if (Number(campaign.currentAmount) < Number(disbursement.amount)) {
                throw new BadRequestException('Quỹ chiến dịch không đủ để giải ngân lúc này!');
            }

            // 2. Cập nhật phiếu giải ngân
            disbursement.status = DisbursementStatus.TRANSFERRED;
            disbursement.txReference = dto.txReference;
            await queryRunner.manager.save(disbursement);

            // LẤY TÀI KHOẢN TỔNG TỪ DATABASE BẰNG MÃ 'SYS_CASH'
            const cashAccount = await queryRunner.manager.findOne(Account, {
                where: { code: 'SYS_CASH' }
            });

            if (!cashAccount) {
                throw new InternalServerErrorException('Lỗi nghiêm trọng: Không tìm thấy tài khoản ngân hàng tổng (SYS_CASH)');
            }

            // 3. TÍCH HỢP INTERNAL LEDGER: Ghi nhận bút toán xuất tiền
            await this.ledgerService.recordTransaction(
                queryRunner.manager,
                LedgerReferenceType.DISBURSEMENT,
                disbursement.id,
                [
                    {
                        accountId: campaign.fundAccountId, // Nợ Quỹ Chiến dịch (Giảm Nợ phải trả)
                        isDebit: true,
                        amount: Number(disbursement.amount)
                    },
                    {
                        accountId: cashAccount.id, // Nợ Quỹ Chiến dịch (Giảm Nợ phải trả)
                        isDebit: false,
                        amount: Number(disbursement.amount)
                    },
                ]
            );

            // 4. Trừ tiền hiển thị ở Campaign
            campaign.currentAmount = Number(campaign.currentAmount) - Number(disbursement.amount);
            await queryRunner.manager.save(campaign);

            await queryRunner.commitTransaction();
            return { message: 'Xác nhận chuyển tiền thành công. Đã trừ quỹ chiến dịch.' };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    // 2. TNV UPLOAD HÓA ĐƠN CHỨNG TỪ
    async uploadProof(disbursementId: string, volunteerId: string, file: Express.Multer.File) {
        if (!file) throw new BadRequestException('Vui lòng tải lên hình ảnh hóa đơn');

        const disbursement = await this.disbursementRepository.findOne({
            where: { id: disbursementId },
            relations: ['volunteer']
        });

        if (!disbursement) throw new NotFoundException('Không tìm thấy phiếu giải ngân');

        // Bảo mật: Chỉ người nhận tiền mới được upload hóa đơn cho khoản tiền đó
        if (disbursement.volunteer.id !== volunteerId) {
            throw new ForbiddenException('Bạn không có quyền upload chứng từ cho giao dịch này');
        }

        if (disbursement.status !== DisbursementStatus.TRANSFERRED) {
            throw new BadRequestException('Khoản tiền này chưa được chuyển, không thể upload chứng từ');
        }

        // Đẩy ảnh lên Cloudinary (chung folder hoặc folder riêng tùy bạn)
        const uploadResult = await this.cloudinaryService.uploadFile(file, CloudinaryFolder.DISBURSEMENT_PROOFS);

        const newProof = this.proofRepository.create({
            disbursement: { id: disbursementId },
            fileUrl: uploadResult.secure_url,
            verificationStatus: ProofStatus.PENDING_AUDIT,
        });

        await this.proofRepository.save(newProof);
        return { message: 'Tải lên chứng từ thành công, chờ kiểm toán.', proofUrl: uploadResult.secure_url };
    }

    // 3. KIỂM TOÁN VIÊN (AUDITOR) ĐÁNH GIÁ CHỨNG TỪ
    async auditProof(proofId: string, dto: AuditProofDto) {
        const proof = await this.proofRepository.findOne({ where: { id: proofId } });
        if (!proof) throw new NotFoundException('Không tìm thấy chứng từ');

        proof.verificationStatus = dto.verificationStatus;

        if (dto.verificationStatus === ProofStatus.FLAGGED) {
            if (!dto.flaggedReason) throw new BadRequestException('Phải nhập lý do đánh dấu gian lận');
            proof.flaggedReason = dto.flaggedReason;
        } else {
            proof.flaggedReason = null; // Xóa lý do nếu chuyển lại thành Verified
        }

        await this.proofRepository.save(proof);
        return { message: `Đã kiểm toán chứng từ: ${dto.verificationStatus}` };
    }
}
