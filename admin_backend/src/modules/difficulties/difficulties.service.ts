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
import { LanguagesService } from '../languages/languages.service';
import { CreateDifficultyDto } from './dto/create-difficulty.dto';
import { QueryDifficultyDto } from './dto/query-difficulty.dto';
import { UpdateDifficultyDto } from './dto/update-difficulty.dto';
import { UpdateDifficultyStatusDto } from './dto/update-difficulty-status.dto';
import { Difficulty } from './entities/difficulty.entity';
import { difficultiesCache } from './difficulties.cache';

@Injectable()
export class DifficultiesService {
  constructor(
    @InjectRepository(Difficulty)
    private readonly difficultiesRepository: Repository<Difficulty>,
    private readonly companyContext: CompanyContextService,
    private readonly languagesService: LanguagesService,
    private readonly redis: RedisService,
  ) {}

  async create(
    createDifficultyDto: CreateDifficultyDto,
  ): Promise<ApiResponse<Difficulty>> {
    await this.languagesService.assertExists(createDifficultyDto.languageId);

    const difficulty = await this.difficultiesRepository.save(
      this.difficultiesRepository.create({
        ...createDifficultyDto,
        companyId: this.companyId,
      }),
    );

    await this.clearDifficultyCache();
    return apiSuccess(
      'Difficulty created successfully',
      await this.getOne(difficulty.id),
    );
  }

  async findAll(
    query: QueryDifficultyDto,
  ): Promise<ApiResponse<PaginatedData<Difficulty>>> {
    const load = async () => {
      const where: FindOptionsWhere<Difficulty> = {
        companyId: this.companyId,
      };

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.languageId) {
        where.languageId = query.languageId;
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(
        this.difficultiesRepository,
        query,
        {
          where,
          relations: { language: true },
          order: { name: 'ASC' },
        },
      );

      return apiSuccess('Difficulties fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      difficultiesCache.listKeysKey(this.companyId),
      difficultiesCache.ttlSeconds,
      difficultiesCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Difficulty>> {
    return getCache(
      this.redis,
      difficultiesCache.itemKey(this.companyId, id),
      difficultiesCache.ttlSeconds,
      async () =>
        apiSuccess('Difficulty fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateDifficultyDto: UpdateDifficultyDto,
  ): Promise<ApiResponse<Difficulty>> {
    const difficulty = await this.getOne(id);

    if (updateDifficultyDto.languageId) {
      await this.languagesService.assertExists(updateDifficultyDto.languageId);
    }

    await this.difficultiesRepository.save(
      this.difficultiesRepository.merge(difficulty, updateDifficultyDto),
    );

    await this.clearDifficultyCache(id);
    return apiSuccess('Difficulty updated successfully', await this.getOne(id));
  }

  async updateStatus(
    id: string,
    updateDifficultyStatusDto: UpdateDifficultyStatusDto,
  ): Promise<ApiResponse<Difficulty>> {
    return this.update(id, updateDifficultyStatusDto);
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.difficultiesRepository,
      { id, companyId: this.companyId },
      'Difficulty not found',
    );

    await this.clearDifficultyCache(id);
    return apiSuccessMessage('Difficulty deleted successfully');
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.difficultiesRepository.existsBy({
      id,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Difficulty not found'));
    }
  }

  private async getOne(id: string): Promise<Difficulty> {
    const difficulty = await this.difficultiesRepository.findOne({
      where: { id, companyId: this.companyId },
      relations: { language: true },
    });

    if (!difficulty) {
      throw new NotFoundException(apiError('Difficulty not found'));
    }

    return difficulty;
  }

  private clearDifficultyCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      difficultiesCache.listKeysKey(this.companyId),
      ...(id ? [difficultiesCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
