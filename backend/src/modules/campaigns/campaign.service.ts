import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { Repository } from 'typeorm';
import { CampaignStatus, CreateCampaignDto, GetCampaignsQueryDto, UpdateCampaignStatusDto } from './dto/campaign.dto';
import { Account } from '../ledger/entities/account.entity';
import { AccountType } from '../ledger/dto/ledger.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class CampaignService {
    constructor(
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
    ) { }

    async create(volunteerId: string, dto: CreateCampaignDto) {
        // // Tự động tạo Tài khoản Kế toán cho Chiến dịch này
        // const newAccount = await this.accountRepository.create({
        //     code: `CAMP_${Date.now()}`,
        //     accountType: AccountType.LIABILITY,
        //     name: `Quỹ chiến dịch: ${dto.title}`,
        //     balance: 0
        // });
        // await this.accountRepository.save(newAccount);

        if (dto.startDate >= dto.endDate)
            throw new BadRequestException('Ngày kết thúc phải lớn hơn ngày bắt đầu');

        const newCampaign = await this.campaignRepository.create({
            ...dto,
            status: CampaignStatus.ACTIVE,
            currentAmount: 0,
            createdBy: { id: volunteerId } as User
        });

        return await this.campaignRepository.save(newCampaign);
    }

    async approveCampaign(campaignId: string, adminId: string) {
        const campaign = await this.findOne(campaignId);

        if (campaign.status !== CampaignStatus.PENDING) {
            throw new BadRequestException('Chiến dịch không ở trạng thái chờ duyệt');
        }

        const newAccount = this.accountRepository.create({
            code: `CAMP_${Date.now()}`,
            accountType: AccountType.LIABILITY,
            name: `Quỹ chiến dịch: ${campaign.title}`,
            balance: 0
        });
        const savedAccount = await this.accountRepository.save(newAccount);

        // Cập nhật trạng thái chiến dịch
        campaign.status = CampaignStatus.ACTIVE;
        campaign.fundAccountId = savedAccount.id;
        campaign.approvedBy = { id: adminId } as User;

        await this.campaignRepository.save(campaign);
        return { message: 'Đã duyệt chiến dịch và khởi tạo Quỹ thành công', campaign };
    }

    async rejectCampaign(campaignId: string, reason: string) {
        const campaign = await this.findOne(campaignId);
        if (campaign.status !== CampaignStatus.PENDING) {
            throw new BadRequestException('Chiến dịch không ở trạng thái chờ duyệt');
        }

        campaign.status = CampaignStatus.REJECTED;
        campaign.rejectionReason = reason;

        await this.campaignRepository.save(campaign);
        return { message: 'Đã từ chối chiến dịch' };
    }

    async findAll(query: GetCampaignsQueryDto) {
        const { page = 1, limit = 10, status, sort = 'DESC' } = query;
        const skip = (page - 1) * limit;
        const whereCondition = status ? { status } : {};

        const [data, total] = await this.campaignRepository.findAndCount({
            where: whereCondition,
            order: { startDate: sort },
            skip: skip,
            take: limit
        });

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
        const campaign = await this.campaignRepository.findOne({ where: { id }, relations: ['createdBy', 'approvedBy'] });
        if (!campaign) {
            throw new NotFoundException(`Không tìm thấy chiến dịch với ID: ${id}`);
        }
        return campaign;
    }

    async getUrgentCampaigns() {
        return this.campaignRepository.find({
            where: { status: CampaignStatus.ACTIVE },
            order: { endDate: 'ASC' },
            take: 6
        });
    }

    async updateStatus(id: string, updateDto: UpdateCampaignStatusDto) {
        const campaign = await this.findOne(id); // Gọi lại hàm findOne để check tồn tại

        campaign.status = updateDto.status;
        await this.campaignRepository.save(campaign);

        return { message: 'Cập nhật trạng thái thành công', campaign };
    }
}
