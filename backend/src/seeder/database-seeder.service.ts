import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserKycStatus } from '../modules/users/entities/user.entity';
import { Role } from '../modules/users/entities/role.entity';
import { Account } from '../modules/ledger/entities/account.entity';
import { Campaign } from '../modules/campaigns/entities/campaign.entity';
import { AccountType } from '../modules/ledger/dto/ledger.dto';
import { CampaignStatus, CampaignType } from '../modules/campaigns/dto/campaign.dto';

@Injectable()
export class DatabaseSeederService {
    private readonly logger = new Logger(DatabaseSeederService.name);

    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
        @InjectRepository(Account) private readonly accountRepository: Repository<Account>,
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
    ) { }

    async seed() {
        this.logger.log('--- BẮT ĐẦU QUÁ TRÌNH SEEDING DỮ LIỆU ---');
        await this.seedRolesAndUsers();
        await this.seedSystemAccounts();
        await this.seedCampaigns(); // Thêm hàm seed chiến dịch
        this.logger.log('--- KẾT THÚC SEEDING ---');
    }

    private async seedRolesAndUsers() {
        this.logger.log('Đang đồng bộ Roles và Users...');

        let adminRole = await this.roleRepository.findOne({ where: { name: 'ADMIN' } });
        let donorRole = await this.roleRepository.findOne({ where: { name: 'DONOR' } });
        let volunteerRole = await this.roleRepository.findOne({ where: { name: 'VOLUNTEER' } });
        let auditorRole = await this.roleRepository.findOne({ where: { name: 'AUDITOR' } });

        if (!adminRole) {
            const roles = this.roleRepository.create([
                { name: 'ADMIN', permissions: ['*'] },
                { name: 'DONOR', permissions: ['view_campaigns', 'donate_fund'] },
                { name: 'VOLUNTEER', permissions: ['view_campaigns', 'join_campaign'] },
                { name: 'AUDITOR', permissions: ['view_campaigns', 'approve_disbursement'] },
            ]);
            const savedRoles = await this.roleRepository.save(roles);
            adminRole = savedRoles.find(r => r.name === 'ADMIN') ?? null;
            donorRole = savedRoles.find(r => r.name === 'DONOR') ?? null;
            volunteerRole = savedRoles.find(r => r.name === 'VOLUNTEER') ?? null;
            auditorRole = savedRoles.find(r => r.name === 'AUDITOR') ?? null;
        }

        const adminEmail = 'admin@gmail.com';
        const adminExists = await this.userRepository.findOne({ where: { email: adminEmail } });

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('111111', 10);

            // 1. Tạo Admin
            const adminUser = this.userRepository.create({
                email: adminEmail,
                hashedPassword,
                fullName: 'System Administrator',
                phone: '0901234567',
                dob: new Date('1990-01-01'),
                gender: 'Nam',
                address: 'Tòa nhà FPT, Quận 9, TP.HCM',
                kycStatus: UserKycStatus.VERIFIED,
                role: adminRole ?? undefined,
            });
            await this.userRepository.save(adminUser);

            // 2. Tạo các members khác với đầy đủ thông tin (Kyc, Bank)
            const members = this.userRepository.create([
                {
                    email: 'donor1@gmail.com',
                    hashedPassword,
                    fullName: 'Nguyễn Nhà Hảo Tâm',
                    phone: '0912345678',
                    dob: new Date('1985-05-15'),
                    gender: 'Nữ',
                    address: 'Quận 1, TP.HCM',
                    bankName: 'Vietcombank',
                    bankAccountNumber: '10123456789',
                    bankAccountName: 'NGUYEN NHA HAO TAM',
                    kycStatus: UserKycStatus.NONE,
                    role: donorRole ?? undefined,
                },
                {
                    email: 'volunteer1@gmail.com',
                    hashedPassword,
                    fullName: 'Trần Tình Nguyện',
                    phone: '0987654321',
                    dob: new Date('2000-10-20'),
                    gender: 'Nam',
                    address: 'Quận Cầu Giấy, Hà Nội',
                    bankName: 'MBBank',
                    bankAccountNumber: '0987654321',
                    bankAccountName: 'TRAN TINH NGUYEN',
                    kycStatus: UserKycStatus.VERIFIED,
                    role: volunteerRole ?? undefined,
                },
                {
                    email: 'auditor1@gmail.com',
                    hashedPassword,
                    fullName: 'Lê Kiểm Toán',
                    phone: '0933445566',
                    dob: new Date('1980-12-30'),
                    gender: 'Nữ',
                    address: 'Quận Hải Châu, Đà Nẵng',
                    kycStatus: UserKycStatus.VERIFIED,
                    role: auditorRole ?? undefined,
                }
            ]);

            await this.userRepository.save(members);
            this.logger.log(' Đã tạo các tài khoản mẫu (Admin, Donor, Volunteer, Auditor).');
        }
    }

    private async seedSystemAccounts() {
        let cashAccount = await this.accountRepository.findOne({ where: { code: 'SYS_CASH' } });
        if (!cashAccount) {
            cashAccount = this.accountRepository.create({
                code: 'SYS_CASH',
                accountType: AccountType.ASSET,
                name: 'Tiền Gửi Ngân Hàng Tổng',
                balance: 0,
            });
            await this.accountRepository.save(cashAccount);
            this.logger.log(' Đã tạo tài khoản Kế toán Tổng (SYS_CASH).');
        }
    }

    private async seedCampaigns() {
        const count = await this.campaignRepository.count();
        if (count > 0) {
            this.logger.log(`Đã có ${count} chiến dịch trong DB, bỏ qua seed campaigns.`);
            return;
        }

        this.logger.log('Đang tạo 40 chiến dịch mẫu...');

        // Danh sách 40 Tên chiến dịch chia theo Lĩnh vực
        const campaignTemplates = [
            // Y TẾ (10)
            { title: 'Phẫu thuật tim bẩm sinh cho bé An', cat: 'Y tế', target: 80000000 },
            { title: 'Chuyến xe Hy Vọng - Hỗ trợ bệnh nhi ung thư', cat: 'Y tế', target: 150000000 },
            { title: 'Nụ cười cho em - Phẫu thuật hở hàm ếch', cat: 'Y tế', target: 50000000 },
            { title: 'Cấp cứu bệnh nhân suy thận xóm chạy thận', cat: 'Y tế', target: 120000000 },
            { title: 'Mang ánh sáng cho người già neo đơn', cat: 'Y tế', target: 60000000 },
            { title: 'Hỗ trợ xe lăn cho người khuyết tật nghèo', cat: 'Y tế', target: 45000000 },
            { title: 'Mua máy thở cho bệnh viện tuyến huyện', cat: 'Y tế', target: 300000000 },
            { title: 'Quỹ thuốc men cho bệnh nhi vùng cao', cat: 'Y tế', target: 75000000 },
            { title: 'Cứu sống mẹ bầu bị tiền sản giật', cat: 'Y tế', target: 50000000 },
            { title: 'Chi phí ghép tủy cho kỹ sư trẻ', cat: 'Y tế', target: 800000000 },

            // GIÁO DỤC (10)
            { title: 'Xây trường mầm non bản Nậm Pồ', cat: 'Giáo dục', target: 500000000 },
            { title: 'Thư viện ước mơ cho học sinh vùng sâu', cat: 'Giáo dục', target: 120000000 },
            { title: 'Áo ấm cho em tới trường', cat: 'Giáo dục', target: 80000000 },
            { title: 'Học bổng sinh viên nghèo vượt khó', cat: 'Giáo dục', target: 200000000 },
            { title: 'Tặng xe đạp cho học sinh ngoại ô', cat: 'Giáo dục', target: 40000000 },
            { title: 'Phòng máy tính cho trường THCS nghèo', cat: 'Giáo dục', target: 150000000 },
            { title: 'Bữa ăn trưa có thịt cho trẻ em miền núi', cat: 'Giáo dục', target: 300000000 },
            { title: 'Sách giáo khoa mới cho năm học mới', cat: 'Giáo dục', target: 50000000 },
            { title: 'Xây nhà bán trú cho học sinh Lai Châu', cat: 'Giáo dục', target: 450000000 },
            { title: 'Đèn năng lượng mặt trời để học bài đêm', cat: 'Giáo dục', target: 60000000 },

            // KHẨN CẤP (8)
            { title: 'Cứu trợ khẩn cấp lũ lụt miền Trung', cat: 'Khẩn cấp', target: 2000000000 },
            { title: 'Hỗ trợ đồng bào bị sạt lở đất', cat: 'Khẩn cấp', target: 800000000 },
            { title: 'Giúp đỡ gia đình nạn nhân vụ hỏa hoạn', cat: 'Khẩn cấp', target: 150000000 },
            { title: 'Cung cấp nước sạch vùng hạn mặn Miền Tây', cat: 'Khẩn cấp', target: 350000000 },
            { title: 'Khắc phục hậu quả sau bão số 3', cat: 'Khẩn cấp', target: 1500000000 },
            { title: 'Hỗ trợ nông dân mất trắng do dông lốc', cat: 'Khẩn cấp', target: 200000000 },
            { title: 'Chuyến hàng y tế khẩn cấp', cat: 'Khẩn cấp', target: 100000000 },
            { title: 'Cứu đói các bản làng bị cô lập', cat: 'Khẩn cấp', target: 250000000 },

            // CỘNG ĐỒNG (7)
            { title: 'Xây cầu dân sinh xóa cầu khỉ', cat: 'Cộng đồng', target: 300000000 },
            { title: 'Mái ấm tình thương cho cụ bà neo đơn', cat: 'Cộng đồng', target: 80000000 },
            { title: 'Khoan giếng nước sạch cho buôn làng', cat: 'Cộng đồng', target: 45000000 },
            { title: 'Chuyến xe 0 đồng đưa công nhân về quê', cat: 'Cộng đồng', target: 150000000 },
            { title: 'Bếp ăn từ thiện tại Bệnh viện K', cat: 'Cộng đồng', target: 200000000 },
            { title: 'Sửa chữa nhà rông văn hóa', cat: 'Cộng đồng', target: 120000000 },
            { title: 'Dự án điện thắp sáng đường quê', cat: 'Cộng đồng', target: 90000000 },

            // MÔI TRƯỜNG (5)
            { title: 'Dự án trồng 10,000 cây xanh chắn sóng', cat: 'Môi trường', target: 150000000 },
            { title: 'Dọn sạch rác bãi biển Nam Định', cat: 'Môi trường', target: 30000000 },
            { title: 'Bảo tồn rùa biển Côn Đảo', cat: 'Môi trường', target: 80000000 },
            { title: 'Lắp thùng rác công cộng vùng nông thôn', cat: 'Môi trường', target: 40000000 },
            { title: 'Tuyên truyền tái chế rác thải nhựa', cat: 'Môi trường', target: 25000000 },
        ];

        // Mảng chứa các ảnh Unsplash ngẫu nhiên cho đẹp
        const imageUrls = [
            'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1547683905-f686c993aae5?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1532938911079-1b06ac7ceec7?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1593113580232-a50616b20ceb?q=80&w=800&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1469571486292-0ba58a3f068b?q=80&w=800&auto=format&fit=crop'
        ];

        // Lặp để tạo từng Campaign
        for (let i = 0; i < campaignTemplates.length; i++) {
            const template = campaignTemplates[i];

            // 1. CHIA TỶ LỆ TRẠNG THÁI (90% Active, 5% Completed, 5% Suspended)
            const randomValue = Math.random();
            let status: CampaignStatus;

            if (randomValue < 0.90) {
                status = CampaignStatus.ACTIVE;
            } else if (randomValue < 0.95) {
                status = CampaignStatus.COMPLETED;
            } else {
                status = CampaignStatus.SUSPENDED;
            }

            // 2. TÍNH TOÁN SỐ TIỀN VÀ NGÀY THÁNG LOGIC THEO TRẠNG THÁI
            let currentAmount = 0;
            const startDate = new Date();
            const endDate = new Date();

            if (status === CampaignStatus.COMPLETED) {
                // Đã xong: Tiền đạt 100% hoặc hơn, Ngày kết thúc phải là quá khứ
                currentAmount = template.target + Math.floor(Math.random() * 5000000); // Có thể dư một chút
                startDate.setDate(startDate.getDate() - 60 - Math.floor(Math.random() * 30)); // Bắt đầu cách đây 60-90 ngày
                endDate.setDate(startDate.getDate() + 30); // Kết thúc sau 30 ngày (tức là đã kết thúc trong quá khứ)
            }
            else if (status === CampaignStatus.SUSPENDED) {
                // Bị đình chỉ: Tiền dang dở (0-30%), Ngày bị đóng băng giữa chừng
                currentAmount = Math.floor(Math.random() * template.target * 0.3);
                startDate.setDate(startDate.getDate() - 15);
                endDate.setDate(startDate.getDate() + 30);
            }
            else {
                // Đang chạy (ACTIVE): Tiền dang dở (10-90%), Ngày kết thúc ở tương lai
                currentAmount = Math.floor((Math.random() * 0.8 + 0.1) * template.target);
                startDate.setDate(startDate.getDate() - Math.floor(Math.random() * 15)); // Mới bắt đầu gần đây
                endDate.setDate(startDate.getDate() + 30 + Math.floor(Math.random() * 30)); // Còn 30-60 ngày nữa
            }

            // 3. BUỘC PHẢI TẠO TÀI KHOẢN KẾ TOÁN TRƯỚC
            const newAccount = this.accountRepository.create({
                code: `CAMP_${Date.now()}_${i}`,
                accountType: AccountType.LIABILITY,
                name: `Quỹ: ${template.title}`,
                balance: currentAmount,
            });
            const savedAccount = await this.accountRepository.save(newAccount);

            // 4. TẠO CHIẾN DỊCH
            const campaign = this.campaignRepository.create({
                title: template.title,
                description: `Đây là chiến dịch thuộc lĩnh vực ${template.cat}. Rất mong nhận được sự quan tâm và ủng hộ từ các nhà hảo tâm trên cả nước để dự án sớm đạt được mục tiêu đề ra. Toàn bộ sao kê sẽ được minh bạch bằng công nghệ Blockchain.`,
                category: template.cat,
                targetAmount: template.target,
                currentAmount: currentAmount,
                status: status,
                campaignType: Math.random() > 0.5 ? CampaignType.FLEXIBLE : CampaignType.FIXED,
                fundAccountId: savedAccount.id,
                startDate: startDate,
                endDate: endDate,
                imageUrl: imageUrls[i % imageUrls.length],
            });

            await this.campaignRepository.save(campaign);
        }

        this.logger.log(' Đã tạo thành công 40 chiến dịch mẫu (kèm Tài khoản Kế toán).');
    }
}