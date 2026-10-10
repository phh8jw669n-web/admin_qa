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
import { CentresService } from '../centres/centres.service';
import { RegionsService } from '../regions/regions.service';
import { CreateLabDto } from './dto/create-lab.dto';
import { QueryLabDto } from './dto/query-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { Lab } from './entities/lab.entity';
import { labsCache } from './labs.cache';

@Injectable()
export class LabsService {
  constructor(
    @InjectRepository(Lab)
    private readonly labsRepository: Repository<Lab>,
    private readonly companyContext: CompanyContextService,
    private readonly regionsService: RegionsService,
    private readonly centresService: CentresService,
    private readonly redis: RedisService,
  ) {}

  async create(createLabDto: CreateLabDto): Promise<ApiResponse<Lab>> {
    await this.assertLocation(
      createLabDto.zoneId,
      createLabDto.regionId,
      createLabDto.centreId,
    );

    const lab = await this.labsRepository.save(
      this.labsRepository.create({
        companyId: this.companyId,
        ...createLabDto,
      }),
    );

    await this.clearLabCache();
    return apiSuccess('Lab created successfully', await this.getOne(lab.id));
  }

  async findAll(query: QueryLabDto): Promise<ApiResponse<PaginatedData<Lab>>> {
    const load = async () => {
      const where: FindOptionsWhere<Lab> = {
        companyId: this.companyId,
      };

      if (query.zoneId) {
        where.zoneId = query.zoneId;
      }

      if (query.regionId) {
        where.regionId = query.regionId;
      }

      if (query.centreId) {
        where.centreId = query.centreId;
      }

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(this.labsRepository, query, {
        where,
        relations: { zone: true, region: true, centre: true },
        order: { updatedAt: 'DESC' },
      });

      return apiSuccess('Labs fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      labsCache.listKeysKey(this.companyId),
      labsCache.ttlSeconds,
      labsCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Lab>> {
    return getCache(
      this.redis,
      labsCache.itemKey(this.companyId, id),
      labsCache.ttlSeconds,
      async () => apiSuccess('Lab fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateLabDto: UpdateLabDto,
  ): Promise<ApiResponse<Lab>> {
    const lab = await this.getOne(id);
    await this.assertLocation(
      updateLabDto.zoneId ?? lab.zoneId,
      updateLabDto.regionId ?? lab.regionId,
      updateLabDto.centreId ?? lab.centreId,
    );
    const locationChanged =
      (updateLabDto.zoneId !== undefined &&
        updateLabDto.zoneId !== lab.zoneId) ||
      (updateLabDto.regionId !== undefined &&
        updateLabDto.regionId !== lab.regionId) ||
      (updateLabDto.centreId !== undefined &&
        updateLabDto.centreId !== lab.centreId);
    const saved = await this.labsRepository.save(
      this.labsRepository.merge(lab, updateLabDto),
    );

    await this.clearLabCache(id);
    return apiSuccess(
      'Lab updated successfully',
      locationChanged ? await this.getOne(saved.id) : saved,
    );
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.labsRepository,
      { id, companyId: this.companyId },
      'Lab not found',
    );

    await this.clearLabCache(id);
    return apiSuccessMessage('Lab deleted successfully');
  }

  private async getOne(id: string): Promise<Lab> {
    const lab = await this.labsRepository.findOne({
      where: { id, companyId: this.companyId },
      relations: { zone: true, region: true, centre: true },
    });

    if (!lab) {
      throw new NotFoundException(apiError('Lab not found'));
    }

    return lab;
  }

  private async assertLocation(
    zoneId: string,
    regionId: string,
    centreId: string,
  ): Promise<void> {
    await this.regionsService.assertBelongsToZone(regionId, zoneId);
    await this.centresService.assertBelongsToLocation(
      centreId,
      zoneId,
      regionId,
    );
  }

  private clearLabCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      labsCache.listKeysKey(this.companyId),
      ...(id ? [labsCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
