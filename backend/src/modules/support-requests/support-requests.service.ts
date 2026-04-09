import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { SupportRequest } from "./support-request.entity";
import { DataSource, Repository } from "typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { CampaignVolunteer } from "../campaigns/entities/campaign-volunteer.entity";
import { CreateSupportRequestDto, SupportRequestStatus, UpdateSupportRequestStatusDto } from "./dto/support-request.dto";
import { Disbursement } from "../transactions/entities/disbursement.entity";

@Injectable()
export class SupportRequestService {
    constructor(
        @InjectRepository(SupportRequest) private readonly supportRequestRepository: Repository<SupportRequest>,
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(CampaignVolunteer) private readonly campaignVolunteerRepository: Repository<CampaignVolunteer>,
        private readonly dataSourse: DataSource
    ) { }

    async createRequest(campaignId: string, volunteerId: string, dto: CreateSupportRequestDto) {
        const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
        if (!campaign || campaign.status !== 'ACTIVE') throw new BadRequestException('Chiến dịch không hợp lệ.');

        // kiem tra tnv có đang tham gia chiến dịch này k
        const isParticipant = await this.campaignVolunteerRepository.findOne({
            where: {
                campaign: { id: campaignId },
                volunteer: { id: volunteerId },
                status: 'ACTIVE'
            }
        });
        if (!isParticipant) throw new BadRequestException('Bạn phải là TNV được duyệt của chiến dịch này mới được xin tạm ứng.');

        // Kiểm tra Quỹ phải bé hơn số tiền trong quỹ
        // Tạm bỏ qua logic trừ tiền đã giải ngân để code đơn giản, thực tế bạn phải tính: Quỹ = Tổng Nạp - Tổng Đã Giải Ngân
        if (dto.requestedAmount > campaign.currentAmount) {
            throw new BadRequestException(`Quỹ chiến dịch không đủ. Hiện chỉ còn ${campaign.currentAmount} VNĐ`);
        }

        const newRequest = await this.supportRequestRepository.create({
            campaign: { id: campaignId },
            requester: { id: volunteerId },
            requestedAmount: dto.requestedAmount,
            description: dto.description,
            status: SupportRequestStatus.PENDING
        });

        return await this.supportRequestRepository.save(newRequest);
    }

    async updateStatus(requestId: string, dto: UpdateSupportRequestStatusDto) {
        const queryRunner = this.dataSourse.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const request = await queryRunner.manager.findOne(SupportRequest, {
                where: { id: requestId },
                relations: ['campaign', 'requester']
            });

            if (!request) throw new NotFoundException('Không tìm thấy phiếu yêu cầu.');
            if (request.status !== SupportRequestStatus.PENDING) throw new BadRequestException('Phiếu này đã được xử lý rồi.');

            // update trang thái
            request.status = dto.status;
            if (dto.status === SupportRequestStatus.REJECTED) {
                if (!dto.rejectionReason) throw new BadRequestException('Vui lòng nhập lý do từ chối.');
                request.rejectionReason = dto.rejectionReason;
            }

            await this.supportRequestRepository.save(request);

            // Nếu DUYỆT => tạo phiếu Disbursement chờ admin ck
            if (dto.status === SupportRequestStatus.APPROVED) {
                const newDisbursement = queryRunner.manager.create(Disbursement, {
                    supportRequest: request,
                    campaign: request.campaign,
                    volunteer: request.requester,
                    amount: request.requestedAmount,
                    status: 'PENDING_TRANSFER'
                });
                await queryRunner.manager.save(newDisbursement);
            }
            await queryRunner.commitTransaction();
            return { message: `Đã xử lý phiếu yêu cầu: ${dto.status}` };

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async getRequestsByCampaign(campaignId: string) {
        return await this.supportRequestRepository.find({
            where: { campaign: { id: campaignId } },
            relations: ['requester'],
            order: { createdAt: 'DESC' }
        });
    }
}