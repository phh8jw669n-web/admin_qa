import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CompanyContextService } from '../../common/auth/company-context.service';
import {
  clearCached,
  getCache,
  getCacheList,
} from '../../common/cache/redis-cache.util';
import { RedisService } from '../../redis/redis.service';
import { PaginatedData } from '../../common/types/paginated-response.type';
import {
  ApiResponse,
  apiError,
  apiSuccess,
  apiSuccessMessage,
} from '../../common/utils/api-response.util';
import { ilikePrefix } from '../../common/utils/ilike.util';
import { paginateRepository } from '../../common/utils/pagination.util';
import { softDeleteIfExists } from '../../common/utils/soft-delete.util';
import { RegionsService } from '../regions/regions.service';
import { CreateCentreDto } from './dto/create-centre.dto';
import { QueryCentreDto } from './dto/query-centre.dto';
import { UpdateCentreDto } from './dto/update-centre.dto';
import { Centre } from './entities/centre.entity';
import { centresCache } from './centres.cache';

@Injectable()
export class CentresService {
  constructor(
    @InjectRepository(Centre)
    private readonly centresRepository: Repository<Centre>,
    private readonly companyContext: CompanyContextService,
    private readonly regionsService: RegionsService,
    private readonly redis: RedisService,
  ) {}

  async create(createCentreDto: CreateCentreDto): Promise<ApiResponse<Centre>> {
    await this.assertLocation(createCentreDto.zoneId, createCentreDto.regionId);

    const centre = await this.centresRepository.save(
      this.centresRepository.create({
        companyId: this.companyId,
        ...createCentreDto,
      }),
    );

    await this.clearCentreCache();
    return apiSuccess(
      'Centre created successfully',
      await this.getOne(centre.id),
    );
  }

  async findAll(
    query: QueryCentreDto,
  ): Promise<ApiResponse<PaginatedData<Centre>>> {
    const load = async () => {
      const where: FindOptionsWhere<Centre> = {
        companyId: this.companyId,
      };

      if (query.zoneId) {
        where.zoneId = query.zoneId;
      }

      if (query.regionId) {
        where.regionId = query.regionId;
      }

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.code) {
        where.code = ilikePrefix(query.code);
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(this.centresRepository, query, {
        where,
        relations: { zone: true, region: true },
        order: { updatedAt: 'DESC' },
      });

      return apiSuccess('Centres fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      centresCache.listKeysKey(this.companyId),
      centresCache.ttlSeconds,
      centresCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Centre>> {
    return getCache(
      this.redis,
      centresCache.itemKey(this.companyId, id),
      centresCache.ttlSeconds,
      async () =>
        apiSuccess('Centre fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateCentreDto: UpdateCentreDto,
  ): Promise<ApiResponse<Centre>> {
    const centre = await this.getOne(id);
    await this.assertLocation(
      updateCentreDto.zoneId ?? centre.zoneId,
      updateCentreDto.regionId ?? centre.regionId,
    );
    const locationChanged =
      (updateCentreDto.zoneId !== undefined &&
        updateCentreDto.zoneId !== centre.zoneId) ||
      (updateCentreDto.regionId !== undefined &&
        updateCentreDto.regionId !== centre.regionId);
    const saved = await this.centresRepository.save(
      this.centresRepository.merge(centre, updateCentreDto),
    );

    await this.clearCentreCache(id);
    return apiSuccess(
      'Centre updated successfully',
      locationChanged ? await this.getOne(saved.id) : saved,
    );
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.centresRepository,
      { id, companyId: this.companyId },
      'Centre not found',
    );

    await this.clearCentreCache(id);
    return apiSuccessMessage('Centre deleted successfully');
  }

  findActiveByCode(
    code: string,
    companyId: string,
  ): Promise<Centre | null> {
    return this.centresRepository.findOne({
      where: { code, companyId, isActive: true },
    });
  }

  findActiveByIdInCompany(
    id: string,
    companyId: string,
  ): Promise<Centre | null> {
    return this.centresRepository.findOne({
      where: { id, companyId, isActive: true },
    });
  }

  async assertExistsInCompany(id: string, companyId?: string): Promise<void> {
    const exists = await this.centresRepository.existsBy({
      id,
      companyId: companyId ?? this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Centre not found'));
    }
  }

  async assertBelongsToLocation(
    id: string,
    zoneId: string,
    regionId: string,
  ): Promise<void> {
    const exists = await this.centresRepository.existsBy({
      id,
      zoneId,
      regionId,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Centre not found'));
    }
  }

  private async getOne(id: string): Promise<Centre> {
    const centre = await this.centresRepository.findOne({
      where: { id, companyId: this.companyId },
      relations: { zone: true, region: true },
    });

    if (!centre) {
      throw new NotFoundException(apiError('Centre not found'));
    }

    return centre;
  }

  private async assertLocation(
    zoneId: string,
    regionId: string,
  ): Promise<void> {
    await this.regionsService.assertBelongsToZone(regionId, zoneId);
  }

  private clearCentreCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      centresCache.listKeysKey(this.companyId),
      ...(id ? [centresCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
