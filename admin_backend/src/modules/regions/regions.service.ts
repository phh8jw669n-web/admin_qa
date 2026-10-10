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
import { ZonesService } from '../zones/zones.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { QueryRegionDto } from './dto/query-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { Region } from './entities/region.entity';
import { regionsCache } from './regions.cache';

@Injectable()
export class RegionsService {
  constructor(
    @InjectRepository(Region)
    private readonly regionsRepository: Repository<Region>,
    private readonly companyContext: CompanyContextService,
    private readonly zonesService: ZonesService,
    private readonly redis: RedisService,
  ) {}

  async create(createRegionDto: CreateRegionDto): Promise<ApiResponse<Region>> {
    await this.zonesService.assertExists(createRegionDto.zoneId);

    const region = await this.regionsRepository.save(
      this.regionsRepository.create({
        companyId: this.companyId,
        ...createRegionDto,
      }),
    );

    await this.clearRegionCache();
    return apiSuccess(
      'Region created successfully',
      await this.getOne(region.id),
    );
  }

  async findAll(
    query: QueryRegionDto,
  ): Promise<ApiResponse<PaginatedData<Region>>> {
    const load = async () => {
      const where: FindOptionsWhere<Region> = {
        companyId: this.companyId,
      };

      if (query.zoneId) {
        where.zoneId = query.zoneId;
      }

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.stateName) {
        where.stateName = ilikePrefix(query.stateName);
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(this.regionsRepository, query, {
        where,
        relations: { zone: true },
        order: { updatedAt: 'DESC' },
      });

      return apiSuccess('Regions fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      regionsCache.listKeysKey(this.companyId),
      regionsCache.ttlSeconds,
      regionsCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Region>> {
    return getCache(
      this.redis,
      regionsCache.itemKey(this.companyId, id),
      regionsCache.ttlSeconds,
      async () =>
        apiSuccess('Region fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateRegionDto: UpdateRegionDto,
  ): Promise<ApiResponse<Region>> {
    const region = await this.getOne(id);
    await this.assertZone(updateRegionDto.zoneId);
    const saved = await this.regionsRepository.save(
      this.regionsRepository.merge(region, updateRegionDto),
    );

    await this.clearRegionCache(id);
    return apiSuccess(
      'Region updated successfully',
      updateRegionDto.zoneId && updateRegionDto.zoneId !== region.zoneId
        ? await this.getOne(saved.id)
        : saved,
    );
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.regionsRepository,
      { id, companyId: this.companyId },
      'Region not found',
    );

    await this.clearRegionCache(id);
    return apiSuccessMessage('Region deleted successfully');
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.regionsRepository.existsBy({
      id,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Region not found'));
    }
  }

  async assertBelongsToZone(id: string, zoneId: string): Promise<void> {
    const exists = await this.regionsRepository.existsBy({
      id,
      zoneId,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Region not found'));
    }
  }

  private async getOne(id: string): Promise<Region> {
    const region = await this.regionsRepository.findOne({
      where: { id, companyId: this.companyId },
      relations: { zone: true },
    });

    if (!region) {
      throw new NotFoundException(apiError('Region not found'));
    }

    return region;
  }

  private async assertZone(zoneId?: string): Promise<void> {
    if (!zoneId) {
      return;
    }

    await this.zonesService.assertExists(zoneId);
  }

  private clearRegionCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      regionsCache.listKeysKey(this.companyId),
      ...(id ? [regionsCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
