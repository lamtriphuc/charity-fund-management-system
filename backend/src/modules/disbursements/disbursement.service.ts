import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Disbursement } from './entities/disbursement.entity';
import { DisbursementProof } from './entities/disbursement-proof.entity';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';
import { DataSource, Repository } from 'typeorm';
import { AuditProofDto, ProofStatus, TransferDisbursementDto } from './dto/disbursement.dto';

@Injectable()
export class DisbursementService {
    constructor(
        @InjectRepository(Disbursement) private disbursementRepository: Repository<Disbursement>,
        @InjectRepository(DisbursementProof) private proofRepository: Repository<DisbursementProof>,
        private cloudinaryService: CloudinaryService,
        private dataSource: DataSource,
    ) { }

    // 1. ADMIN XÁC NHẬN ĐÃ CHUYỂN TIỀN
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
            if (disbursement.status !== 'PENDING_TRANSFER') {
                throw new BadRequestException('Phiếu này đã được chuyển tiền hoặc không hợp lệ');
            }

            // 1. Trừ tiền trực tiếp vào quỹ của chiến dịch
            const campaign = disbursement.campaign;
            if (Number(campaign.currentAmount) < Number(disbursement.amount)) {
                throw new BadRequestException('Quỹ chiến dịch không đủ để giải ngân lúc này!');
            }
            campaign.currentAmount = Number(campaign.currentAmount) - Number(disbursement.amount);
            await queryRunner.manager.save(campaign);

            // 2. Cập nhật phiếu giải ngân
            disbursement.status = 'TRANSFERRED';
            disbursement.txReference = dto.txReference;
            await queryRunner.manager.save(disbursement);

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

        if (disbursement.status !== 'TRANSFERRED') {
            throw new BadRequestException('Khoản tiền này chưa được chuyển, không thể upload chứng từ');
        }

        // Đẩy ảnh lên Cloudinary (chung folder hoặc folder riêng tùy bạn)
        const uploadResult = await this.cloudinaryService.uploadFile(file, 'disbursement_proofs');

        const newProof = this.proofRepository.create({
            disbursement: { id: disbursementId },
            fileUrl: uploadResult.secure_url,
            verificationStatus: 'PENDING_AUDIT',
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
