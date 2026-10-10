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
import { CreateZoneDto } from './dto/create-zone.dto';
import { QueryZoneDto } from './dto/query-zone.dto';
import { UpdateZoneDto } from './dto/update-zone.dto';
import { Zone } from './entities/zone.entity';
import { zonesCache } from './zones.cache';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone)
    private readonly zonesRepository: Repository<Zone>,
    private readonly companyContext: CompanyContextService,
    private readonly redis: RedisService,
  ) {}

  async create(createZoneDto: CreateZoneDto): Promise<ApiResponse<Zone>> {
    const zone = await this.zonesRepository.save(
      this.zonesRepository.create({
        companyId: this.companyId,
        ...createZoneDto,
      }),
    );

    await this.clearZoneCache();
    return apiSuccess('Zone created successfully', zone);
  }

  async findAll(
    query: QueryZoneDto,
  ): Promise<ApiResponse<PaginatedData<Zone>>> {
    const load = async () => {
      const where: FindOptionsWhere<Zone> = {
        companyId: this.companyId,
      };

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(this.zonesRepository, query, {
        where,
        order: { updatedAt: 'DESC' },
      });

      return apiSuccess('Zones fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      zonesCache.listKeysKey(this.companyId),
      zonesCache.ttlSeconds,
      zonesCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Zone>> {
    return getCache(
      this.redis,
      zonesCache.itemKey(this.companyId, id),
      zonesCache.ttlSeconds,
      async () =>
        apiSuccess('Zone fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateZoneDto: UpdateZoneDto,
  ): Promise<ApiResponse<Zone>> {
    const zone = await this.getOne(id);
    const saved = await this.zonesRepository.save(
      this.zonesRepository.merge(zone, updateZoneDto),
    );

    await this.clearZoneCache(id);
    return apiSuccess('Zone updated successfully', saved);
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.zonesRepository,
      { id, companyId: this.companyId },
      'Zone not found',
    );

    await this.clearZoneCache(id);
    return apiSuccessMessage('Zone deleted successfully');
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.zonesRepository.existsBy({
      id,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Zone not found'));
    }
  }

  private async getOne(id: string): Promise<Zone> {
    const zone = await this.zonesRepository.findOne({
      where: { id, companyId: this.companyId },
    });

    if (!zone) {
      throw new NotFoundException(apiError('Zone not found'));
    }

    return zone;
  }

  private clearZoneCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      zonesCache.listKeysKey(this.companyId),
      ...(id ? [zonesCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
