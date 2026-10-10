import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { hashPassword } from '../../common/utils/password.util';
import { Admin } from '../../modules/admins/entities/admin.entity';
import { AdminRole } from '../../modules/admins/enums/admin-role.enum';

type SuperAdminEnv = {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  mobile?: string;
  countryCode?: string;
};

@Injectable()
export class SuperAdminSeederService {
  private readonly logger = new Logger(SuperAdminSeederService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(Admin)
    private readonly adminsRepository: Repository<Admin>,
  ) {}

  async seed(): Promise<void> {
    const env = this.configService.get<SuperAdminEnv>('superAdmin');

    if (!env?.email) {
      this.logger.warn('SUPER_ADMIN_EMAIL not set; skipping Super-Admin seed');
      return;
    }

    const missing = this.getMissingFields(env);

    if (missing.length > 0) {
      throw new Error(
        `Super-Admin seed is incomplete. Missing env: ${missing.join(', ')}`,
      );
    }

    await this.ensureSuperAdmin({
      email: env.email!.trim().toLowerCase(),
      password: env.password!.trim(),
      firstName: env.firstName!.trim(),
      lastName: env.lastName!.trim(),
      mobile: env.mobile!.trim(),
      countryCode: env.countryCode?.trim() || '91',
    });
  }

  private getMissingFields(env: SuperAdminEnv): string[] {
    const required: Array<{ key: keyof SuperAdminEnv; name: string }> = [
      { key: 'email', name: 'SUPER_ADMIN_EMAIL' },
      { key: 'password', name: 'SUPER_ADMIN_PASSWORD' },
      { key: 'firstName', name: 'SUPER_ADMIN_FIRST_NAME' },
      { key: 'lastName', name: 'SUPER_ADMIN_LAST_NAME' },
      { key: 'mobile', name: 'SUPER_ADMIN_MOBILE' },
    ];

    return required
      .filter(({ key }) => !env[key]?.trim())
      .map(({ name }) => name);
  }

  private async ensureSuperAdmin(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    mobile: string;
    countryCode: string;
  }): Promise<void> {
    const existing = await this.adminsRepository.findOne({
      where: {
        email: data.email,
        companyId: IsNull(),
        role: AdminRole.SUPER_ADMIN,
      },
    });

    if (existing) {
      this.logger.log(`Super-Admin already exists (${data.email}); skipping`);
      return;
    }

    const admin = this.adminsRepository.create({
      email: data.email,
      passwordHash: await hashPassword(data.password),
      firstName: data.firstName,
      lastName: data.lastName,
      mobileNumber: data.mobile,
      countryCode: data.countryCode,
      role: AdminRole.SUPER_ADMIN,
      companyId: null,
      isActive: true,
      isMfaEnabled: false,
    });

    await this.adminsRepository.save(admin);
    this.logger.log(`Created Super-Admin (${data.email})`);
  }
}
