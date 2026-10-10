import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CompanyContextService } from '../../common/auth/company-context.service';
import { apiError } from '../../common/utils/api-response.util';
import { ilikePrefix } from '../../common/utils/ilike.util';
import { paginateRepository } from '../../common/utils/pagination.util';
import { hashPassword } from '../../common/utils/password.util';
import { softDeleteIfExists } from '../../common/utils/soft-delete.util';
import { CentresService } from '../centres/centres.service';
import { CreateCentreUserDto } from './dto/create-centre-user.dto';
import { QueryCentreUserDto } from './dto/query-centre-user.dto';
import { UpdateCentreUserDto } from './dto/update-centre-user.dto';
import { CentreUser } from './entities/centre-user.entity';
import {
  CENTRE_USER_LIST_SELECT,
  PaginatedCentreUsers,
} from './types/centre-user.type';

@Injectable()
export class CentreUsersService {
  constructor(
    @InjectRepository(CentreUser)
    private readonly centreUsersRepository: Repository<CentreUser>,
    private readonly companyContext: CompanyContextService,
    private readonly centresService: CentresService,
    private readonly configService: ConfigService,
  ) {}

  async create(dto: CreateCentreUserDto): Promise<CentreUser> {
    const companyId = this.companyId;

    await this.centresService.assertExistsInCompany(dto.centreId, companyId);

    const { password, ...rest } = dto;
    const centreUser = this.centreUsersRepository.create({
      ...rest,
      companyId,
      passwordHash: await hashPassword(password ?? this.getDefaultPassword()),
    });

    return this.centreUsersRepository.save(centreUser);
  }

  async findAll(query: QueryCentreUserDto): Promise<PaginatedCentreUsers> {
    const where: FindOptionsWhere<CentreUser> = {
      companyId: this.companyId,
    };

    if (query.centreId) {
      where.centreId = query.centreId;
    }

    if (query.name) {
      where.name = ilikePrefix(query.name);
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    return paginateRepository(this.centreUsersRepository, query, {
      where,
      select: CENTRE_USER_LIST_SELECT,
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<CentreUser> {
    const centreUser = await this.centreUsersRepository.findOne({
      where: { id, companyId: this.companyId },
    });

    if (!centreUser) {
      throw new NotFoundException(apiError('Centre user not found'));
    }

    return centreUser;
  }

  async update(id: string, dto: UpdateCentreUserDto): Promise<CentreUser> {
    const centreUser = await this.findOne(id);
    const { password, centreId, ...rest } = dto;

    if (centreId !== undefined) {
      await this.centresService.assertExistsInCompany(centreId, this.companyId);
    }

    return this.centreUsersRepository.save(
      this.centreUsersRepository.merge(centreUser, {
        ...rest,
        ...(centreId !== undefined ? { centreId } : {}),
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      }),
    );
  }

  async remove(id: string): Promise<{ id: string }> {
    await softDeleteIfExists(
      this.centreUsersRepository,
      { id, companyId: this.companyId },
      'Centre user not found',
    );

    return { id };
  }

  findByEmailAndCompanyId(
    email: string,
    companyId: string,
  ): Promise<CentreUser | null> {
    return this.centreUsersRepository.findOne({
      where: {
        email: email.toLowerCase(),
        companyId,
      },
    });
  }

  findActiveById(id: string): Promise<CentreUser | null> {
    return this.centreUsersRepository.findOne({
      where: { id, isActive: true },
    });
  }

  async setRefreshTokenHash(
    id: string,
    refreshTokenHash: string | null,
  ): Promise<void> {
    await this.centreUsersRepository.update(id, { refreshTokenHash });
  }

  async invalidateSession(id: string): Promise<void> {
    await this.centreUsersRepository.increment({ id }, 'tokenVersion', 1);
    await this.centreUsersRepository.update(id, { refreshTokenHash: null });
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }

  private getDefaultPassword(): string {
    return this.configService.getOrThrow<string>('admin.defaultPassword');
  }
}
