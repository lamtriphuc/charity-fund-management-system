import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Donation } from "./entities/donation.entity";
import { DataSource, Repository } from "typeorm";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { CreateDonationDto, WebhookPaymentDto } from "./dto/donation.dto";
import { User } from "../users/entities/user.entity";
import { LedgerService } from "../ledger/ledger.service";
import { Account } from "../ledger/entities/account.entity";
import { PayOS } from "@payos/node";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class DonationService {
    private payOS: PayOS;

    constructor(
        @InjectRepository(Donation) private readonly donationRepository: Repository<Donation>,
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        private readonly dataSource: DataSource,
        private readonly ledgerService: LedgerService,
        private configService: ConfigService
    ) {
        this.payOS = new PayOS({
            clientId: this.configService.getOrThrow('PAYOS_CLIENT_ID'),
            apiKey: this.configService.getOrThrow('PAYOS_API_KEY'),
            checksumKey: this.configService.getOrThrow('PAYOS_CHECKSUM_KEY'),
        });
    }

    async createDonation(campaignId: string, userId: string | null, dto: CreateDonationDto) {
        const campaign = await this.campaignRepository.findOne({ where: { id: campaignId } });
        if (!campaign || campaign.status !== "ACTIVE")
            throw new BadRequestException('Chiến dịch không tồn tại hoặc đã đóng.');

        const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000));
        const txReference = String(orderCode);

        let finalDonorName: string | null = null;

        if (!dto.isAnonymous) {
            if (dto.donorName) {
                finalDonorName = dto.donorName;
            } else if (userId) {
                const user = await this.userRepository.findOne({ where: { id: userId } });
                finalDonorName = user?.fullName ?? null;
            } else {
                finalDonorName = 'Khách vãn lai'
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
            status: 'PENDING',
        });

        await this.donationRepository.save(donation);

        const cleanTitle = campaign.title
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Xóa dấu
            .replace(/đ/g, 'd').replace(/Đ/g, 'D') // Chữ Đ đặc biệt
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
                bin: paymentLink.bin
            };
        } catch (error) {
            console.error('Lỗi gọi API PayOS:', error);
            await this.donationRepository.delete(donation.id);
            throw new InternalServerErrorException('Không thể tạo mã thanh toán lúc này. Vui lòng thử lại sau.');
        }
    }

    async cancelPendingDonation(txReference: string) {
        await this.donationRepository.delete({ txReference: txReference, status: 'PENDING' });
        return { message: 'Đã dọn dẹp giao dịch rác' };
    }

    // Hàm cho Frontend Polling
    async checkDonationStatus(txReference: string) {
        const donation = await this.donationRepository.findOne({
            where: { txReference },
            select: ['status']
        });
        if (!donation) throw new NotFoundException('Không tìm thấy giao dịch');
        return { status: donation.status };
    }

    async processPaymentWebhook(dto: any) {
        //  PayOS Webhook trả về dạng { success: true, data: { orderCode: 123... } }
        if (!dto || !dto.data || !dto.data.orderCode) return { message: 'Invalid webhook payload' };

        const txReference = String(dto.data.orderCode);
        const isSuccess = dto.success === true || dto.code === '00';

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 1. Tìm giao dịch
            const donation = await queryRunner.manager.findOne(Donation, {
                where: { txReference: txReference },
                relations: ['campaign'],
            });

            if (!donation) throw new NotFoundException('Không tìm thấy giao dịch');
            if (donation.status === 'SUCCESS') return { message: 'Giao dịch này đã được xử lý rồi' };

            if (isSuccess) {
                donation.status = 'SUCCESS';
                await queryRunner.manager.save(donation);

                // TÍCH HỢP INTERNAL LEDGER
                // Nghiệp vụ: Nhận tiền tài trợ
                // Nợ (Debit) TK Ngân hàng: Tăng tài sản
                // Có (Credit) TK Quỹ Chiến dịch: Tăng nguồn vốn (trách nhiệm phải chi)

                const cashAccount = await queryRunner.manager.findOne(Account, {
                    where: { code: 'SYS_CASH' }
                });
                if (!cashAccount) {
                    throw new InternalServerErrorException('Lỗi nghiêm trọng: Không tìm thấy tài khoản ngân hàng tổng (SYS_CASH)');
                }

                await this.ledgerService.recordTransaction(
                    queryRunner.manager,
                    'DONATION',
                    donation.id,
                    [
                        {
                            accountId: cashAccount.id,
                            isDebit: true, // Nợ
                            amount: Number(donation.amount)
                        },
                        {
                            accountId: donation.campaign.fundAccountId,
                            isDebit: false, // Có
                            amount: Number(donation.amount)
                        }
                    ]
                );

                // Cộng tiền vào tổng của chiến dịch
                const campaign = donation.campaign;
                campaign.currentAmount = Number(campaign.currentAmount) + Number(donation.amount);
                await queryRunner.manager.save(campaign);
            } else {
                donation.status = 'FAILED';
                await queryRunner.manager.save(donation);
            }

            await queryRunner.commitTransaction();
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
            where: { campaign: { id: campaignId }, status: 'SUCCESS' },
            order: { createdAt: 'DESC' },
            relations: ['donor']
        });

        // Ẩn tên nếu họ chọn isAnonymous
        return donations.map(d => ({
            id: d.id,
            amount: d.amount,
            message: d.message,
            createdAt: d.createdAt,
            donorName: d.isAnonymous ? 'Nhà hảo tâm ẩn danh' : (d.donor?.fullName || 'Khách vãng lai'),
        }));
    }
}