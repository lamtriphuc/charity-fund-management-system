import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { Campaign } from 'src/modules/campaigns/entities/campaign.entity';
import { Role } from 'src/modules/users/entities/role.entity';
import { User } from 'src/modules/users/entities/user.entity';
import { KycProfileStatus, UserKycStatus } from 'src/modules/users/dto/user.dto';
import { Account } from 'src/modules/ledger/entities/account.entity';
import { AccountType, LedgerReferenceType } from 'src/modules/ledger/dto/ledger.dto';
import { CampaignStatus, CampaignType } from 'src/modules/campaigns/dto/campaign.dto';
import { Donation } from 'src/modules/donations/entities/donation.entity';
import { DonationStatus } from 'src/modules/donations/dto/donation.dto';
import { Disbursement } from 'src/modules/disbursements/entities/disbursement.entity';
import { DisbursementStatus, ProofStatus } from 'src/modules/disbursements/dto/disbursement.dto';
import { DisbursementProof } from 'src/modules/disbursements/entities/disbursement-proof.entity';
import { LedgerTransaction } from 'src/modules/ledger/entities/ledger-transaction.entity';
import { LedgerLine } from 'src/modules/ledger/entities/ledger-line.entity';
import axios from 'axios';
import { KycProfile } from 'src/modules/users/entities/kyc-profile.entity';

// TẬP HỢP ẢNH GIẢ LẬP ĐỂ KHÔNG TỐN DUNG LƯỢNG CLOUDINARY
const CAMPAIGN_CATEGORIES = [
    { name: 'Trẻ em nghèo', cover: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1170&auto=format&fit=crop' },
    { name: 'Từ thiện', cover: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=1170&auto=format&fit=crop' },
    { name: 'Cộng đồng', cover: 'https://images.unsplash.com/photo-1531844251246-9a1bfaae09fc?q=80&w=1216&auto=format&fit=crop' },
    { name: 'Y tế', cover: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?q=80&w=1170&auto=format&fit=crop' },
    { name: 'Giáo dục', cover: 'https://images.unsplash.com/photo-1610159661596-8e777a72f6af?q=80&w=1170&auto=format&fit=crop' },
];

const DUMMY_CAMPAIGN_PROOFS = [
    'https://placehold.co/600x800/eeeeee/999999?text=Bien+Nhan+Ung+Ho',
    'https://placehold.co/600x800/eeeeee/999999?text=Hoa+Don+Mua+Vat+Pham',
    'https://placehold.co/600x800/eeeeee/999999?text=Hinh+Anh+Trao+Tang',
    'https://placehold.co/600x800/eeeeee/999999?text=Giay+Xac+Nhan+Hoan+Canh',
];

const DUMMY_RECEIPTS = [
    'https://placehold.co/600x800/eeeeee/999999?text=Hoa+Don+GTGT+Vat+Lieu',
    'https://placehold.co/600x800/eeeeee/999999?text=Bien+Lai+Chuyen+Tien+Ngan+Hang',
    'https://placehold.co/600x800/eeeeee/999999?text=Hoa+Don+Thuoc+Men+Benh+Vien',
];

const getRandomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomItems = <T>(arr: T[], count: number): T[] => [...arr].sort(() => 0.5 - Math.random()).slice(0, count);

const CAMPAIGN_TITLES = [
    'Áo ấm vùng cao Hà Giang',
    'Bữa cơm yêu thương cho bệnh nhi',
    'Cùng em đến trường ở Điện Biên',
    'Cứu trợ đồng bào miền Trung sau bão',
    'Tủ sách nhỏ cho học sinh vùng sâu',
    'Nước sạch cho bản làng Tây Nguyên',
    'Hỗ trợ viện phí cho bệnh nhân nghèo',
    'Mái nhà an toàn cho hộ khó khăn',
    'Gạo nghĩa tình cho người già neo đơn',
    'Xe lăn yêu thương cho người khuyết tật',
    'Thắp sáng lớp học vùng biên',
    'Tiếp sức mùa tựu trường',
    'Hỗ trợ trẻ em mồ côi sau dịch',
    'Chuyến xe 0 đồng về quê ăn Tết',
    'Sữa dinh dưỡng cho trẻ suy dinh dưỡng',
    'Cứu trợ khẩn cấp sau sạt lở',
    'Nhà vệ sinh học đường vùng cao',
    'Máy tính cũ cho em học trực tuyến',
    'Học bổng vượt khó cho sinh viên nghèo',
    'Bếp ăn cộng đồng cuối tuần',
    'Túi thuốc yêu thương cho vùng xa',
    'Quỹ phẫu thuật tim cho trẻ em',
    'Hỗ trợ ngư dân sau thiên tai',
    'Đèn năng lượng mặt trời cho bản nghèo',
    'Cầu dân sinh qua suối',
    'Hỗ trợ phụ nữ đơn thân khó khăn',
    'Sửa trường sau mùa mưa lũ',
    'Chăn ấm cho trẻ em vùng núi',
    'Giếng nước sạch cho miền hạn mặn',
    'Tết ấm cho công nhân xa quê',
    'Bữa sáng miễn phí cho học sinh nghèo',
    'Hỗ trợ bệnh nhân chạy thận',
    'Tủ quần áo sẻ chia cộng đồng',
    'Cùng em giữ ước mơ đại học',
    'Gian hàng 0 đồng mùa dịch',
    'Hỗ trợ gia đình bị hỏa hoạn',
    'Đường đến trường an toàn',
    'Sách giáo khoa cho học sinh khó khăn',
    'Chăm sóc sức khỏe người cao tuổi',
    'Quỹ khẩn cấp vì trẻ em',
    'Nâng bước em tới lớp',
    'Cứu trợ mùa lũ Quảng Bình',
    'Mùa đông không lạnh ở Sa Pa',
    'Hỗ trợ mái ấm tình thương',
    'Bình nước lọc cho điểm trường xa',
    'Hành trình thiện nguyện Tây Bắc',
    'Gây quỹ thuốc men vùng biên',
    'Chung tay xây lớp học mới',
    'Gói an sinh cho hộ nghèo',
    'Quỹ yêu thương minh bạch'
];

const CAMPAIGN_DESCRIPTIONS = [
    'Chiến dịch hỗ trợ các hoàn cảnh khó khăn, ưu tiên công khai tiến độ tiếp nhận và sử dụng quỹ.',
    'Mọi khoản đóng góp được ghi nhận vào hệ thống và sử dụng theo từng đợt giải ngân có chứng từ.',
    'Nguồn quỹ được dùng để mua nhu yếu phẩm, vật tư và hỗ trợ trực tiếp cho người thụ hưởng.',
    'Chiến dịch hướng đến việc hỗ trợ cộng đồng chịu ảnh hưởng bởi thiên tai, bệnh tật hoặc hoàn cảnh đặc biệt.',
];

const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const randomAmount = (minMillion: number, maxMillion: number): number => {
    const value = Math.floor(Math.random() * (maxMillion - minMillion + 1)) + minMillion;
    return value * 1000000;
};


@Injectable()
export class DatabaseSeederService {
    private readonly logger = new Logger(DatabaseSeederService.name);

    constructor(
        @InjectRepository(Campaign) private readonly campaignRepository: Repository<Campaign>,
        private readonly dataSource: DataSource
    ) { }

    async seed() {
        const count = await this.campaignRepository.count();
        if (count > 0) {
            this.logger.log('Dữ liệu đã tồn tại, bỏ qua quá trình Seeding.');
            return;
        }

        this.logger.log('--- BẮT ĐẦU SEEDING DỮ LIỆU ĐẠI TRÀ (100 Users, 50 Campaigns) ---');

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const { admins, volunteers, donors } = await this.seedRolesAndUsers(queryRunner.manager);
            await this.seedSystemAccounts(queryRunner.manager);
            await this.seedCampaignsAndTransactions(queryRunner.manager, admins, volunteers, donors);

            await queryRunner.commitTransaction();
            this.logger.log('--- KẾT THÚC SEEDING: HỆ THỐNG ĐÃ SẴN SÀNG ---');
        } catch (error) {
            await queryRunner.rollbackTransaction();
            this.logger.error('Seeding thất bại, đã Rollback toàn bộ!', error.stack);
        } finally {
            await queryRunner.release();
        }
    }

    private async seedRolesAndUsers(manager: EntityManager) {
        this.logger.log('Đang tạo Roles và 100 Users...');

        const roles = [
            manager.create(Role, { name: 'SUPER_ADMIN', permissions: ['*'] }),
            manager.create(Role, { name: 'ADMIN', permissions: ['MANAGE_USERS', 'APPROVE_CAMPAIGN', 'APPROVE_DISBURSEMENT', 'VIEW_AUDIT_LOGS'] }),
            manager.create(Role, { name: 'AUDITOR', permissions: ['VIEW_AUDIT_LOGS', 'AUDIT_PROOFS'] }),
            manager.create(Role, { name: 'VOLUNTEER', permissions: ['CREATE_CAMPAIGN', 'REQUEST_DISBURSEMENT', 'VIEW_OWN_CAMPAIGN'] }),
            manager.create(Role, { name: 'DONOR', permissions: ['CREATE_DONATION'] })
        ];
        await manager.save(roles);

        const hashedPassword = await bcrypt.hash('123456', 10);
        const usersToSave: User[] = [];

        const superAdmin = manager.create(User, { email: 'admin@charity.com', hashedPassword, fullName: 'Super Admin', kycStatus: UserKycStatus.VERIFIED, role: roles[0] });
        usersToSave.push(superAdmin);

        const admins: User[] = [];
        for (let i = 1; i <= 4; i++) {
            const admin = manager.create(User, { email: `mod${i}@charity.com`, hashedPassword, fullName: `Mod Quản Trị ${i}`, kycStatus: UserKycStatus.VERIFIED, role: roles[1] });
            admins.push(admin);
            usersToSave.push(admin);
        }

        for (let i = 1; i <= 4; i++) {
            const auditor = manager.create(User, { email: `auditor${i}@charity.com`, hashedPassword, fullName: 'Ban Kiểm Soát Viên', kycStatus: UserKycStatus.VERIFIED, role: roles[2] });
            usersToSave.push(auditor);
        }

        const volunteers: User[] = [];
        for (let i = 1; i <= 40; i++) {
            const vol = manager.create(User, { email: `volunteer${i}@gmail.com`, hashedPassword, fullName: `Tình Nguyện Viên ${i}`, kycStatus: UserKycStatus.VERIFIED, role: roles[3], bankName: 'Vietcombank', bankAccountNumber: `190312${i}89`, bankAccountName: `TINH NGUYEN VIEN ${i}` });
            volunteers.push(vol);
            usersToSave.push(vol);
        }

        const donors: User[] = [];
        for (let i = 1; i <= 55; i++) {
            const donor = manager.create(User, { email: `donor${i}@gmail.com`, hashedPassword, fullName: `Nhà Hảo Tâm ${i}`, kycStatus: UserKycStatus.NONE, role: roles[4] });
            donors.push(donor);
            usersToSave.push(donor);
        }

        await manager.save(usersToSave);
        return { superAdmin, admins, volunteers, donors };
    }

    private async seedSystemAccounts(manager: EntityManager) {
        const bankAccount = manager.create(Account, { code: 'SYS_BANK_MAIN', accountType: AccountType.ASSET, name: 'Tài khoản Ngân hàng Tổng', balance: 0 });
        const generalFund = manager.create(Account, { code: 'SYS_GENERAL_FUND', accountType: AccountType.LIABILITY, name: 'Quỹ Dự Phòng Khẩn Cấp', balance: 0 });
        await manager.save([bankAccount, generalFund]);
    }

    private async createSpecialDemoAccount(
        manager: EntityManager,
        donors: User[],
        timelineEvents: any[],
        timeOffset: number
    ): Promise<number> {
        this.logger.log('Đang tạo tài khoản Demo chuyên biệt (volunter@gmail.com)...');

        const now = new Date();
        const hashedPassword = await bcrypt.hash('123456', 10);

        // Khởi tạo theo cách an toàn để tránh lỗi TypeScript
        const demoVolunteer = new User();
        demoVolunteer.email = 'volunteer@gmail.com';
        demoVolunteer.hashedPassword = hashedPassword;
        demoVolunteer.fullName = 'Tình Nguyện Viên Demo';
        demoVolunteer.kycStatus = UserKycStatus.VERIFIED;
        demoVolunteer.bankName = 'MBBank';
        demoVolunteer.bankAccountNumber = '0987654321';
        demoVolunteer.bankAccountName = 'TINH NGUYEN VIEN DEMO';

        // Tìm và gán Role đúng cách
        const volunteerRole = await manager.findOne(Role, { where: { name: 'VOLUNTEER' } });
        if (volunteerRole) {
            demoVolunteer.role = volunteerRole;
        }

        const savedVolunteer = await manager.save(demoVolunteer);

        const kycProfile = manager.create(KycProfile, { // Phải dùng file import entity KycProfile nhé
            user: savedVolunteer,
            frontImageUrl: 'https://placehold.co/600x400/eeeeee/999999?text=CCCD+Mat+Truoc',
            backImageUrl: 'https://placehold.co/600x400/eeeeee/999999?text=CCCD+Mat+Sau',
            portraitImageUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=800&auto=format&fit=crop',
            extractedName: 'TÌNH NGUYỆN VIÊN DEMO',
            extractedIdNumber: '001099123456',
            extractedDob: '01/01/1999',
            extractedGender: 'Nam',
            extractedAddress: 'Hà Nội',
            status: KycProfileStatus.APPROVED,
            submittedAt: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
            reviewedAt: new Date(now.getTime() - 19 * 24 * 60 * 60 * 1000)
        });
        await manager.save(kycProfile);

        // Tùy chỉnh Chiến dịch Demo
        const campStartDate = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000); // Bắt đầu 10 ngày trước
        const campEndDate = addDays(now, 50); // Còn 50 ngày nữa

        const targetAmount = 500000000; // 500 Triệu

        const demoCampaign = manager.create(Campaign, {
            title: 'Phẫu Thuật Tim Bẩm Sinh Khẩn Cấp Cho Bé Lê Văn Sỹ',
            description: 'Bé Sỹ sinh ra với căn bệnh tim bẩm sinh hiểm nghèo. Gia đình thuộc diện hộ cận nghèo tại Quảng Nam, không có khả năng chi trả viện phí phẫu thuật lên đến hàng trăm triệu đồng. Bác sĩ chỉ định phải mổ khẩn cấp trong tháng tới. Quỹ CharityFund kêu gọi sự chung tay từ cộng đồng để mang lại nhịp đập khỏe mạnh cho em.',
            category: 'Y tế',
            targetAmount: targetAmount,
            currentAmount: 0,
            status: CampaignStatus.ACTIVE,
            campaignType: CampaignType.FLEXIBLE,
            imageUrls: 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?q=80&w=1174&auto=format&fit=crop,https://placehold.co/600x800/eeeeee/999999?text=Giay+Xac+Nhan+Benh+Vien',
            createdBy: demoVolunteer,
            startDate: campStartDate,
            endDate: campEndDate,
            createdAt: campStartDate,
        });
        await manager.save(demoCampaign);

        const fundAccount = manager.create(Account, {
            code: `CAMP_${demoCampaign.id}_FUND`,
            accountType: AccountType.LIABILITY,
            name: `Quỹ Chiến dịch - ${demoCampaign.title}`,
            balance: 0
        });
        await manager.save(fundAccount);

        // Bơm tiền quyên góp đạt ~65% tiến độ
        const numDonations = 15;
        const donateAmountPerPerson = Math.floor((targetAmount * 0.65) / numDonations);

        for (let d = 0; d < numDonations; d++) {
            const randomDonor = donors[d % donors.length];
            const donateDate = new Date(campStartDate.getTime() + d * 16 * 60 * 60 * 1000);
            donateDate.setMilliseconds(donateDate.getMilliseconds() + timeOffset++);

            timelineEvents.push({
                type: 'DONATION',
                campaign: demoCampaign,
                fundAccount,
                donor: randomDonor,
                amount: donateAmountPerPerson + Math.floor(Math.random() * 500000),
                txDate: donateDate
            });
        }

        return timeOffset;
    }

    private async seedCampaignsAndTransactions(manager: EntityManager, admins: User[], volunteers: User[], donors: User[]) {
        this.logger.log('Đang tạo 50 chiến dịch và lập lịch các giao dịch theo kịch bản Demo...');

        const now = new Date();
        const startOfTime = new Date(2024, 0, 5);
        const campaignCount = 50;

        // MẢNG CHỨA TOÀN BỘ SỰ KIỆN TÀI CHÍNH ĐỂ SORT TRƯỚC KHI BĂM HASH
        const timelineEvents: any[] = [];
        let timeOffset = 0;

        timeOffset = await this.createSpecialDemoAccount(manager, donors, timelineEvents, timeOffset);

        for (let i = 0; i < campaignCount; i++) {
            // PHÂN BỔ KỊCH BẢN:
            // i = 0: CHIẾN DỊCH DEMO (Hoàn hảo, Active)
            // i = 1 - 8: COMPLETED (8 chiến dịch hoàn thành)
            // i = 9 - 43: ACTIVE (Thời hạn 2 - 60 ngày)
            // i = 44 - 49: PENDING (Chờ duyệt)
            let status: CampaignStatus;
            if (i === 0) status = CampaignStatus.ACTIVE;
            else if (i >= 43) status = CampaignStatus.PENDING;
            else if (i <= 7) status = CampaignStatus.COMPLETED;
            else status = CampaignStatus.ACTIVE;

            const volunteer = volunteers[i % volunteers.length];
            const admin = admins[i % admins.length];
            const randomCategory = CAMPAIGN_CATEGORIES[i % CAMPAIGN_CATEGORIES.length];

            let title = CAMPAIGN_TITLES[i % CAMPAIGN_TITLES.length];
            let description = `${getRandomItem(CAMPAIGN_DESCRIPTIONS)} Lĩnh vực hỗ trợ: ${randomCategory.name}.`;
            let target = randomAmount(80, 500);
            let campStartDate = new Date(startOfTime.getTime() + (i * 15 * 24 * 60 * 60 * 1000));
            let campEndDate: Date;

            // KIẾN TẠO THỜI GIAN THEO KỊCH BẢN
            if (i === 0) {
                // [CHIẾN DỊCH DEMO] - Phẫu thuật tim cho bé Sỹ
                campStartDate = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000); // Bắt đầu 15 ngày trước
                campEndDate = addDays(now, 45); // Còn đúng 45 ngày nữa -> Tổng thời lượng: 60 ngày
            } else if (status === CampaignStatus.COMPLETED) {
                // ĐÃ HOÀN THÀNH: Đã kết thúc từ 1 đến 30 ngày trước
                const daysEndedAgo = Math.floor(Math.random() * 30) + 1;
                campEndDate = new Date(now.getTime() - daysEndedAgo * 24 * 60 * 60 * 1000);
                campStartDate = new Date(campEndDate.getTime() - 45 * 24 * 60 * 60 * 1000); // Mỗi chiến dịch chạy 45 ngày
            } else if (status === CampaignStatus.PENDING) {
                // CHỜ DUYỆT: Vừa tạo hôm nay
                campStartDate = now;
                campEndDate = addDays(now, 30 + (i % 20));
            } else {
                // ACTIVE THÔNG THƯỜNG: LOGIC THỰC TẾ
                // 1. Một chiến dịch tiêu chuẩn dài từ 30 đến 60 ngày.
                const totalDurationDays = Math.floor(Math.random() * 31) + 30; // Random 30 -> 60

                // 2. Vừa được admin duyệt cách đây 1 đến 15 ngày
                const daysStartedAgo = Math.floor(Math.random() * 15) + 1;
                campStartDate = new Date(now.getTime() - daysStartedAgo * 24 * 60 * 60 * 1000);

                // 3. Ngày kết thúc = Ngày bắt đầu + Tổng thời lượng
                // Đảm bảo số ngày còn lại luôn từ 15 -> 59 ngày, không bao giờ có chuyện mới tạo mà 2 ngày nữa hết hạn.
                campEndDate = addDays(campStartDate, totalDurationDays);
            }

            const imageUrls = [
                randomCategory.cover,
                ...getRandomItems(DUMMY_CAMPAIGN_PROOFS, 2)
            ].join(',');

            const campaign = manager.create(Campaign, {
                title,
                description,
                category: i === 0 ? 'Y tế' : randomCategory.name,
                targetAmount: target,
                currentAmount: 0,
                status,
                campaignType: CampaignType.FLEXIBLE,
                // Ảnh Demo đẹp hơn, có ảnh giường bệnh (mô phỏng)
                imageUrls: i === 0 ? 'https://images.unsplash.com/photo-1512678080530-7760d81faba6?q=80&w=1174&auto=format&fit=crop,https://placehold.co/600x800/eeeeee/999999?text=Giay+Xac+Nhan+Benh+Vien' : imageUrls,
                createdBy: volunteer,
                approvedBy: status === CampaignStatus.PENDING ? undefined : admin,
                startDate: campStartDate,
                endDate: campEndDate,
                createdAt: campStartDate,
            });
            await manager.save(campaign);

            if (status === CampaignStatus.PENDING) continue;

            const fundAccount = manager.create(Account, {
                code: `CAMP_${campaign.id}_FUND`,
                accountType: AccountType.LIABILITY,
                name: `Quỹ Chiến dịch - ${campaign.title}`,
                balance: 0
            });
            await manager.save(fundAccount);

            // =========================================================
            // GHI NHẬN GIAO DỊCH VÀO MẢNG CHỜ (ĐỂ SORT BẢO VỆ MÃ HASH)
            // =========================================================
            let campaignDonationTotal = 0;

            if (i === 0) {
                // LOGIC RIÊNG CHO DEMO: Donate 210M (60% tiến độ), 0 GIẢI NGÂN
                const numDonations = 12;
                for (let d = 0; d < numDonations; d++) {
                    const randomDonor = donors[(i * 7 + d) % donors.length];
                    const donateAmount = Math.floor(210_000_000 / numDonations) + randomAmount(1, 5);

                    const donateDate = addDays(campStartDate, d);
                    donateDate.setMilliseconds(donateDate.getMilliseconds() + timeOffset++);

                    timelineEvents.push({
                        type: 'DONATION',
                        campaign, fundAccount, donor: randomDonor, amount: donateAmount, txDate: donateDate
                    });
                }
                // KHÔNG TẠO DISBURSEMENT CHO CHIẾN DỊCH SỐ 0 ĐỂ BẠN CÓ THỂ DEMO
            } else {
                // LOGIC CHO CÁC CHIẾN DỊCH KHÁC
                const numDonations = status === CampaignStatus.COMPLETED ? 8 + (i % 5) : 3 + (i % 6);

                for (let d = 0; d < numDonations; d++) {
                    const randomDonor = donors[(i * 7 + d) % donors.length];
                    let donateAmount = randomAmount(2, 25);
                    if (status === CampaignStatus.COMPLETED) {
                        donateAmount = Math.floor(target / numDonations) + randomAmount(-1, 2); // Cố hoàn thành mục tiêu
                    }

                    const donateDate = addDays(campStartDate, 1 + d * 2);
                    donateDate.setMilliseconds(donateDate.getMilliseconds() + timeOffset++);

                    if (donateDate > now) break;

                    timelineEvents.push({
                        type: 'DONATION',
                        campaign, fundAccount, donor: randomDonor, amount: donateAmount, txDate: donateDate
                    });
                    campaignDonationTotal += donateAmount;
                }

                // TẠO GIẢI NGÂN
                const lastDonationDay = 1 + (numDonations - 1) * 2;
                const firstDisbDate = addDays(campStartDate, lastDonationDay + 1);

                if (campaignDonationTotal > 0 && firstDisbDate <= now) {
                    const disbursementRatio = status === CampaignStatus.COMPLETED ? 0.9 : 0.4;
                    const firstDisbAmount = Math.floor(campaignDonationTotal * disbursementRatio);

                    firstDisbDate.setMilliseconds(firstDisbDate.getMilliseconds() + timeOffset++);

                    timelineEvents.push({
                        type: 'DISBURSEMENT',
                        campaign, fundAccount, volunteer, amount: firstDisbAmount, txDate: firstDisbDate
                    });

                    if (status === CampaignStatus.COMPLETED && campaignDonationTotal - firstDisbAmount > 0) {
                        const remainingDisbAmount = campaignDonationTotal - firstDisbAmount;
                        const secondDisbDate = addDays(firstDisbDate, 3);
                        secondDisbDate.setMilliseconds(secondDisbDate.getMilliseconds() + timeOffset++);

                        if (secondDisbDate <= now) {
                            timelineEvents.push({
                                type: 'DISBURSEMENT',
                                campaign, fundAccount, volunteer, amount: remainingDisbAmount, txDate: secondDisbDate
                            });
                        }
                    }
                }
            }
        }

        // ==============================================================
        // BƯỚC QUAN TRỌNG NHẤT: SẮP XẾP SỰ KIỆN THEO DÒNG THỜI GIAN
        // BẢO VỆ CHUỖI HASH KHÔNG BỊ VỠ KHI ĐỐI SOÁT
        // ==============================================================
        this.logger.log(`Đang tái tạo Sổ cái bất biến cho ${timelineEvents.length} giao dịch lịch sử...`);
        timelineEvents.sort((a, b) => a.txDate.getTime() - b.txDate.getTime());

        let currentChainHash = 'GENESIS_HASH_0000000000000000';

        for (const event of timelineEvents) {
            if (event.type === 'DONATION') {
                currentChainHash = await this.simulateDonation(
                    manager, event.campaign, event.fundAccount, event.donor, event.amount, currentChainHash, event.txDate
                );
            } else if (event.type === 'DISBURSEMENT') {
                currentChainHash = await this.simulateDisbursementAndProofs(
                    manager, event.campaign, event.fundAccount, event.volunteer, event.amount, currentChainHash, event.txDate
                );
            }
        }

        const balances = await this.getSeedBalances(manager);
        this.logger.log(`Kiểm tra sau seed: Cash=${balances.cash}, Liability=${balances.liability}, Chênh lệch=${balances.cash - balances.liability}`);
        if (balances.cash !== balances.liability) {
            throw new Error(`Seed bị lệch sổ cái: Cash=${balances.cash}, Liability=${balances.liability}`);
        }
    }

    private async getSeedBalances(manager: EntityManager) {
        const cashAccount = await manager.findOne(Account, { where: { code: 'SYS_BANK_MAIN' } });
        const { totalLiability } = await manager
            .createQueryBuilder(Account, 'account')
            .select('SUM(account.balance)', 'totalLiability')
            .where("account.account_type = :type", { type: AccountType.LIABILITY })
            .getRawOne();

        return {
            cash: Number(cashAccount?.balance || 0),
            liability: Number(totalLiability || 0),
        };
    }

    // =====================================================================
    // HÀM MÔ PHỎNG LUỒNG KẾ TOÁN (Áp dụng chuẩn accountCode)
    // =====================================================================

    private async simulateDonation(
        manager: EntityManager, campaign: Campaign, fundAccount: Account,
        donor: User, amount: number, previousHash: string, txDate: Date
    ): Promise<string> {
        const donation = manager.create(Donation, {
            campaign, donor, amount, status: DonationStatus.SUCCESS,
            txReference: `DONATE_${txDate.getTime()}_${Math.floor(Math.random() * 100)}`,
            message: 'Mong mọi điều tốt đẹp nhất!',
            createdAt: txDate
        });
        await manager.save(donation);

        // Nợ Ngân hàng (ASSET tăng) - Có Quỹ chiến dịch (LIABILITY tăng)
        const entries = [
            { accountCode: 'SYS_BANK_MAIN', isDebit: true, amount },
            { accountCode: fundAccount.code, isDebit: false, amount }
        ];

        const newHash = await this.recordLedgerTransaction(manager, LedgerReferenceType.DONATION, donation.id, 'Quyên góp thành công', entries, previousHash, txDate);
        campaign.currentAmount = Number(campaign.currentAmount) + amount;
        await manager.save(campaign);

        return newHash;
    }

    private async simulateDisbursementAndProofs(
        manager: EntityManager, campaign: Campaign, fundAccount: Account,
        volunteer: User, amount: number, previousHash: string, txDate: Date
    ): Promise<string> {
        const disbursement = manager.create(Disbursement, {
            campaign, volunteer, amount, status: DisbursementStatus.TRANSFERRED,
            title: 'Rút tiền mua vật tư cứu trợ', purpose: 'Mua nhu yếu phẩm và vật liệu',
            txReference: `FT${txDate.getTime()}`,
            bankName: volunteer.bankName, bankAccountNumber: volunteer.bankAccountNumber, bankAccountName: volunteer.bankAccountName,
            createdAt: txDate
        });
        await manager.save(disbursement);

        const fakeImageUrl = DUMMY_RECEIPTS[Math.floor(Math.random() * DUMMY_RECEIPTS.length)];

        try {
            // 1. Tải ảnh dummy về bộ nhớ đệm
            const response = await axios.get(fakeImageUrl, { responseType: 'arraybuffer' });
            const fileBuffer = Buffer.from(response.data);

            const fileHash = crypto
                .createHash('sha256')
                .update(fileBuffer)
                .digest('hex');

            const secret = process.env.SIGNATURE_SECRET || '10bafb7d29840b888d5de40dbee1df5b524e4b8f3acf024f3b3f3f770b1377bf825d2be51d0cbe533fb457a832e434c0672e392c2268e8fc6955daf4cc7eda41'
            const hmacSignature = crypto
                .createHmac('sha256', secret)
                .update(`${fileHash}-${volunteer.id}-${disbursement.id}`)
                .digest('hex');

            // 4. Lưu Proof
            const proof = manager.create(DisbursementProof, {
                disbursement,
                fileUrl: fakeImageUrl,
                hmacSignature, // Chữ ký nay đã chuẩn
                verificationStatus: ProofStatus.VERIFIED,
                createdAt: txDate
            });
            await manager.save(proof);
        } catch (err) {
            this.logger.error(`Lỗi tạo chữ ký giả lập cho ảnh: ${fakeImageUrl}`, err.message);
        }

        // Nợ Quỹ chiến dịch (LIABILITY giảm) - Có Ngân hàng (ASSET giảm)
        const entries = [
            { accountCode: fundAccount.code, isDebit: true, amount },
            { accountCode: 'SYS_BANK_MAIN', isDebit: false, amount }
        ];

        const newHash = await this.recordLedgerTransaction(manager, LedgerReferenceType.DISBURSEMENT, disbursement.id, 'Giải ngân thành công', entries, previousHash, txDate);
        return newHash;
    }

    private async recordLedgerTransaction(
        manager: EntityManager, refType: LedgerReferenceType, refId: string, description: string,
        entries: any[], previousHash: string, txDate: Date
    ): Promise<string> {
        const totalDebit = entries
            .filter(entry => entry.isDebit)
            .reduce((sum, entry) => sum + Number(entry.amount), 0);
        const totalCredit = entries
            .filter(entry => !entry.isDebit)
            .reduce((sum, entry) => sum + Number(entry.amount), 0);

        if (totalDebit !== totalCredit) {
            throw new Error(`Bút toán không cân bằng: Nợ=${totalDebit}, Có=${totalCredit}`);
        }

        const sortedEntries = [...entries].sort((a, b) => a.accountCode.localeCompare(b.accountCode));
        const payload = JSON.stringify({ referenceType: refType, referenceId: refId, description, entries: sortedEntries });

        const dataToHash = `${payload}|${previousHash}`;
        const currentHash = crypto.createHash('sha256').update(dataToHash).digest('hex');

        const ledgerTx = manager.create(LedgerTransaction, {
            referenceType: refType,
            referenceId: refId,
            description,
            previousHash,
            currentHash,
            createdAt: txDate
        });
        await manager.save(ledgerTx);

        for (const entry of sortedEntries) {
            const account = await manager.findOne(Account, { where: { code: entry.accountCode } });
            if (!account) {
                throw new Error(`Không tìm thấy tài khoản kế toán: ${entry.accountCode}`);
            }

            const line = manager.create(LedgerLine, {
                ledgerTransaction: ledgerTx,
                account,
                isDebit: entry.isDebit,
                amount: entry.amount
            });
            await manager.save(line);

            // ASSET: Nợ tăng, Có giảm
            // LIABILITY: Nợ giảm, Có tăng
            if (account.accountType === AccountType.ASSET) {
                account.balance = Number(account.balance) + (entry.isDebit ? entry.amount : -entry.amount);
            } else {
                account.balance = Number(account.balance) + (entry.isDebit ? -entry.amount : entry.amount);
            }

            if (Number(account.balance) < 0) {
                throw new Error(`Seed tạo số dư âm ở tài khoản ${account.code}`);
            }

            await manager.save(account);
        }

        return currentHash;
    }

}