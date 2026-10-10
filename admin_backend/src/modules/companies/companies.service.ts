import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, Repository } from 'typeorm';
import {
  clearCached,
  getCache,
  getCacheList,
} from '../../common/cache/redis-cache.util';
import { CompanyTokenPayload } from '../../common/types/jwt-payload.type';
import { RedisService } from '../../redis/redis.service';
import { apiError } from '../../common/utils/api-response.util';
import { getNextGlobalCode } from '../../common/utils/get-next-code.util';
import { ilikePrefix } from '../../common/utils/ilike.util';
import { paginateRepository } from '../../common/utils/pagination.util';
import { softDeleteIfExists } from '../../common/utils/soft-delete.util';
import { hashPassword } from '../../common/utils/password.util';
import { Admin } from '../admins/entities/admin.entity';
import { AdminRole } from '../admins/enums/admin-role.enum';
import {
  COMPANY_CODE_PAD_LENGTH,
  COMPANY_CODE_PREFIX,
  PLAN_DURATION_DAYS,
} from './constants/companies.constants';
import { CreateCompanyDto } from './dto/create-company.dto';
import { QueryCompanyDto } from './dto/query-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { UpdateOwnCompanyDto } from './dto/update-own-company.dto';
import { VerifyWorkspaceDto } from './dto/verify-workspace.dto';
import { companiesCache } from './companies.cache';
import { Company } from './entities/company.entity';
import { CompanyStatus } from './enums/company.enum';
import { PaginatedCompanies } from './types/company-list-item.type';
import { syncStatusAndActive } from './utils/normalize-company.util';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(Admin)
    private readonly adminsRepository: Repository<Admin>,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async create(createCompanyDto: CreateCompanyDto): Promise<Company> {
    const { firstName, lastName, adminPassword, ...companyFields } =
      createCompanyDto;

    return this.dataSource
      .transaction(async (manager) => {
        const companiesRepository = manager.getRepository(Company);
        const adminsRepository = manager.getRepository(Admin);

        const payload = syncStatusAndActive(companyFields);
        const companyCode = await getNextGlobalCode(
          companiesRepository,
          COMPANY_CODE_PREFIX,
          COMPANY_CODE_PAD_LENGTH,
          { codeField: 'companyCode', withDeleted: true },
        );
        const company = await companiesRepository.save(
          companiesRepository.create({
            ...payload,
            companyCode,
            planEndsAt: payload.planEndsAt
              ? new Date(payload.planEndsAt)
              : this.getDefaultPlanEndsAt(),
          }),
        );

        const admin = adminsRepository.create({
          companyId: company.id,
          firstName,
          lastName,
          email: company.email,
          role: AdminRole.ADMIN,
          passwordHash: await hashPassword(
            adminPassword ?? this.getDefaultAdminPassword(),
          ),
          isActive: true,
          isMfaEnabled: false,
        });

        await adminsRepository.save(admin);

        return company;
      })
      .then(async (company) => {
        await this.clearCompanyCache();
        return company;
      });
  }

  async findAll(query: QueryCompanyDto): Promise<PaginatedCompanies> {
    const load = async () => {
      const where: FindOptionsWhere<Company> = {};

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.city) {
        where.city = ilikePrefix(query.city);
      }

      if (query.plan) {
        where.plan = query.plan;
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      return paginateRepository(this.companiesRepository, query, {
        where,
        select: {
          id: true,
          name: true,
          city: true,
          companyCode: true,
          workspaceUrl: true,
          isActive: true,
          status: true,
          planEndsAt: true,
        },
        order: { updatedAt: 'DESC' },
      });
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      companiesCache.listKeysKey(),
      companiesCache.ttlSeconds,
      companiesCache.listKey(query),
      load,
    );
  }

  async findOne(id: string): Promise<Company> {
    return this.loadCompany(id);
  }

  async findCached(id: string): Promise<Company> {
    return getCache(
      this.redis,
      companiesCache.itemKey(id),
      companiesCache.ttlSeconds,
      () => this.loadCompany(id),
    );
  }

  async findOneForCompany(id: string, companyId: string): Promise<Company> {
    this.assertOwnCompany(id, companyId);
    return this.findCached(id);
  }

  async update(
    id: string,
    updateCompanyDto: UpdateCompanyDto,
  ): Promise<Company> {
    const company = await this.loadCompany(id);
    const payload = syncStatusAndActive({ ...updateCompanyDto });

    const saved = await this.companiesRepository.save(
      this.companiesRepository.merge(company, {
        ...payload,
        planEndsAt: this.resolvePlanEndsAt(
          payload.planEndsAt,
          company.planEndsAt,
        ),
      }),
    );
    await this.clearCompanyCache(id);
    return saved;
  }

  async updateForCompany(
    id: string,
    companyId: string,
    updateOwnCompanyDto: UpdateOwnCompanyDto,
  ): Promise<Company> {
    this.assertOwnCompany(id, companyId);
    const company = await this.loadCompany(id);

    const saved = await this.companiesRepository.save(
      this.companiesRepository.merge(company, updateOwnCompanyDto),
    );
    await this.clearCompanyCache(id);
    return saved;
  }

  async remove(id: string): Promise<{ id: string }> {
    await softDeleteIfExists(
      this.companiesRepository,
      { id },
      'Company not found',
      {
        set: {
          isActive: false,
          status: CompanyStatus.INACTIVE,
          deletedAt: new Date(),
        },
      },
    );

    await this.clearCompanyCache(id);
    return { id };
  }

  async verifyWorkspace(dto: VerifyWorkspaceDto): Promise<{
    companyToken: string;
    name: string;
    companyLogo: string | null;
    favicon: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
  }> {
    const company = await this.companiesRepository
      .createQueryBuilder('company')
      .where('LOWER(TRIM(company.workspaceUrl)) = LOWER(TRIM(:workspaceUrl))', {
        workspaceUrl: dto.workspaceUrl,
      })
      .getOne();

    if (
      !company ||
      !company.isActive ||
      company.status !== CompanyStatus.ACTIVE
    ) {
      throw new BadRequestException(
        apiError('Invalid workspace or company is not active'),
      );
    }

    if (company.planEndsAt && company.planEndsAt.getTime() < Date.now()) {
      throw new ForbiddenException(
        apiError('Company plan has expired. Please renew your subscription.'),
      );
    }

    const companyToken = await this.jwtService.signAsync(
      { sub: company.id, type: 'company' } satisfies CompanyTokenPayload,
      {
        secret: this.configService.getOrThrow<string>('jwt.companySecret'),
        expiresIn: '7d',
      },
    );

    return {
      companyToken,
      name: company.name,
      companyLogo: company.companyLogo,
      favicon: company.favicon,
      primaryColor: company.primaryColor,
      secondaryColor: company.secondaryColor,
    };
  }

  private async loadCompany(id: string): Promise<Company> {
    const company = await this.companiesRepository.findOne({
      where: { id },
    });

    if (!company) {
      throw new NotFoundException(apiError('Company not found'));
    }

    return company;
  }

  private clearCompanyCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      companiesCache.listKeysKey(),
      ...(id ? [companiesCache.itemKey(id)] : []),
    );
  }

  private assertOwnCompany(id: string, companyId: string): void {
    if (id !== companyId) {
      throw new NotFoundException(apiError('Company not found'));
    }
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.companiesRepository.existsBy({ id });

    if (!exists) {
      throw new NotFoundException(apiError('Company not found'));
    }
  }

  private resolvePlanEndsAt(
    incoming: string | Date | null | undefined,
    current: Date | null,
  ): Date | null {
    if (incoming === undefined) {
      return current;
    }

    return incoming ? new Date(incoming) : null;
  }

  private getDefaultAdminPassword(): string {
    return this.configService.getOrThrow<string>('admin.defaultPassword');
  }

  private getDefaultPlanEndsAt(): Date {
    const planEndsAt = new Date();
    planEndsAt.setUTCDate(planEndsAt.getUTCDate() + PLAN_DURATION_DAYS);
    return planEndsAt;
  }
}
