import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, IsNull, Repository } from 'typeorm';
import { apiError } from '../../common/utils/api-response.util';
import { ilikePrefix } from '../../common/utils/ilike.util';
import { paginateRepository } from '../../common/utils/pagination.util';
import { hashPassword } from '../../common/utils/password.util';
import { softDeleteIfExists } from '../../common/utils/soft-delete.util';
import { CompaniesService } from '../companies/companies.service';
import { CreateAdminDto } from './dto/create-admin.dto';
import { QueryAdminDto } from './dto/query-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { Admin } from './entities/admin.entity';
import { AdminRole } from './enums/admin-role.enum';
import {
  ADMIN_LIST_SELECT,
  PaginatedAdmins,
} from './types/admin-list-item.type';

@Injectable()
export class AdminsService {
  constructor(
    @InjectRepository(Admin)
    private readonly adminsRepository: Repository<Admin>,
    private readonly companiesService: CompaniesService,
    private readonly configService: ConfigService,
  ) {}

  async create(createAdminDto: CreateAdminDto): Promise<Admin> {
    const { password, ...rest } = createAdminDto;

    if (rest.role === AdminRole.SUPER_ADMIN) {
      throw new BadRequestException(
        apiError('Super-Admin accounts cannot be created from this screen'),
      );
    }

    await this.companiesService.assertExists(rest.companyId);

    const admin = this.adminsRepository.create({
      ...rest,
      passwordHash: await hashPassword(password ?? this.getDefaultPassword()),
    });

    return this.adminsRepository.save(admin);
  }

  async findAll(query: QueryAdminDto): Promise<PaginatedAdmins> {
    const filters: FindOptionsWhere<Admin> = {};

    if (query.isActive !== undefined) {
      filters.isActive = query.isActive;
    }

    const where: FindOptionsWhere<Admin> | FindOptionsWhere<Admin>[] =
      query.search
        ? [
            { ...filters, firstName: ilikePrefix(query.search) },
            { ...filters, lastName: ilikePrefix(query.search) },
            { ...filters, email: ilikePrefix(query.search) },
          ]
        : filters;

    return paginateRepository(this.adminsRepository, query, {
      where,
      select: ADMIN_LIST_SELECT,
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Admin> {
    const admin = await this.adminsRepository.findOne({
      where: { id },
    });

    if (!admin) {
      throw new NotFoundException(apiError('Admin not found'));
    }

    return admin;
  }

  findByEmailAndCompanyId(
    email: string,
    companyId: string,
  ): Promise<Admin | null> {
    return this.adminsRepository.findOne({
      where: {
        email: email.toLowerCase(),
        companyId,
        role: AdminRole.ADMIN,
      },
    });
  }

  findSuperAdminByEmail(email: string): Promise<Admin | null> {
    return this.adminsRepository.findOne({
      where: {
        email: email.toLowerCase(),
        companyId: IsNull(),
        role: AdminRole.SUPER_ADMIN,
      },
    });
  }

  findActiveById(id: string): Promise<Admin | null> {
    return this.adminsRepository.findOne({
      where: { id, isActive: true },
    });
  }

  async setRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.adminsRepository.update(id, { refreshTokenHash });
  }

  async invalidateSession(id: string): Promise<void> {
    await this.adminsRepository.increment({ id }, 'tokenVersion', 1);
    await this.adminsRepository.update(id, { refreshTokenHash: null });
  }

  async update(id: string, dto: UpdateAdminDto): Promise<Admin> {
    const admin = await this.findOne(id);
    const { password, ...rest } = dto;

    return this.adminsRepository.save(
      this.adminsRepository.merge(admin, {
        ...rest,
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      }),
    );
  }

  async remove(id: string): Promise<{ id: string }> {
    await softDeleteIfExists(this.adminsRepository, { id }, 'Admin not found');

    return { id };
  }

  private getDefaultPassword(): string {
    return this.configService.getOrThrow<string>('admin.defaultPassword');
  }
}
