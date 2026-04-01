import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { KycStatus } from 'src/common/enums/kyc-status.enum';

@Injectable()
export class DatabaseSeederService {
    private readonly logger = new Logger(DatabaseSeederService.name);

    constructor(
        @InjectRepository(User) private readonly userRepository: Repository<User>,
        @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    ) { }

    // Đổi tên hàm và BỎ OnModuleInit
    async seed() {
        this.logger.log('--- BẮT ĐẦU QUÁ TRÌNH SEEDING DỮ LIỆU ---');
        await this.seedRolesAndAdmin();
        this.logger.log('--- KẾT THÚC SEEDING ---');
    }

    private async seedRolesAndAdmin() {
        let adminRole = await this.roleRepository.findOne({ where: { name: 'ADMIN' } });
        let donorRole = await this.roleRepository.findOne({ where: { name: 'DONOR' } });
        let volunteerRole = await this.roleRepository.findOne({ where: { name: 'VOLUNTEER' } });
        let auditorRole = await this.roleRepository.findOne({ where: { name: 'AUDITOR' } });

        if (!adminRole) {
            this.logger.log('Tạo Roles...');
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
            this.logger.log('Tạo Admin User...');
            const hashedPassword = await bcrypt.hash('111111', 10);
            const adminUser = this.userRepository.create({
                email: adminEmail,
                hashedPassword,
                fullName: 'System Administrator',
                kycStatus: KycStatus.VERIFIED,
                role: adminRole ?? undefined,
            });
            await this.userRepository.save(adminUser);

            const members = this.userRepository.create([
                {
                    email: 'donor1@gmail.com',
                    hashedPassword,
                    fullName: 'Donor 1',
                    kycStatus: KycStatus.PENDING,
                    role: donorRole ?? undefined,
                },
                {
                    email: 'volunteer1@gmail.com',
                    hashedPassword,
                    fullName: 'Volunteer 1',
                    kycStatus: KycStatus.VERIFIED,
                    role: volunteerRole ?? undefined,
                },
                {
                    email: 'auditor1@gmail.com',
                    hashedPassword,
                    fullName: 'Auditor 1',
                    kycStatus: KycStatus.VERIFIED,
                    role: auditorRole ?? undefined,
                }
            ]);

            await this.userRepository.save(members);
        }
    }
}