import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Campaign } from './entities/campaign.entity';
import { Repository } from 'typeorm';
import { CreateCampaignDto, GetCampaignsQueryDto, UpdateCampaignStatusDto } from './dto/campaign.dto';
import { CampaignStatus } from 'src/modules/campaigns/dto/campaign.enum';
import { Account } from '../ledger/entities/account.entity';
import { AccountType } from '../ledger/dto/ledger.dto';

@Injectable()
export class CampaignService {
    constructor(
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
    ) { }

    async create(dto: CreateCampaignDto) {
        // Tự động tạo Tài khoản Kế toán cho Chiến dịch này
        const newAccount = this.accountRepository.create({
            code: `CAMP_${Date.now()}`,
            accountType: AccountType.LIABILITY,
            name: `Quỹ chiến dịch: ${dto.title}`,
            balance: 0
        });
        await this.accountRepository.save(newAccount);

        if (dto.startDate >= dto.endDate) throw new BadRequestException('Ngày kết thúc phải lớn hơn ngày bắt đầu');

        const newCampaign = await this.campaignRepository.create({
            ...dto,
            status: CampaignStatus.ACTIVE,
            currentAmount: 0,
            fundAccountId: newAccount.id
        });

        return await this.campaignRepository.save(newCampaign);
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
        const campaign = await this.campaignRepository.findOne({ where: { id } });
        if (!campaign) {
            throw new NotFoundException(`Không tìm thấy chiến dịch với ID: ${id}`);
        }
        return campaign;
    }

    async updateStatus(id: string, updateDto: UpdateCampaignStatusDto) {
        const campaign = await this.findOne(id); // Gọi lại hàm findOne để check tồn tại

        campaign.status = updateDto.status;
        await this.campaignRepository.save(campaign);

        return { message: 'Cập nhật trạng thái thành công', campaign };
    }
}
