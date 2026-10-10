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
import { CreateLanguageDto } from './dto/create-language.dto';
import { QueryLanguageDto } from './dto/query-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { Language } from './entities/language.entity';
import { languagesCache } from './languages.cache';

@Injectable()
export class LanguagesService {
  constructor(
    @InjectRepository(Language)
    private readonly languagesRepository: Repository<Language>,
    private readonly companyContext: CompanyContextService,
    private readonly redis: RedisService,
  ) {}

  async create(
    createLanguageDto: CreateLanguageDto,
  ): Promise<ApiResponse<Language>> {
    const language = await this.languagesRepository.save(
      this.languagesRepository.create({
        companyId: this.companyId,
        ...createLanguageDto,
      }),
    );

    await this.clearLanguageCache();
    return apiSuccess('Language created successfully', language);
  }

  async findAll(
    query: QueryLanguageDto,
  ): Promise<ApiResponse<PaginatedData<Language>>> {
    if (query.name) {
      return this.loadLanguages(query);
    }

    return getCacheList(
      this.redis,
      languagesCache.listKeysKey(this.companyId),
      languagesCache.ttlSeconds,
      languagesCache.listKey(this.companyId, query),
      () => this.loadLanguages(query),
    );
  }

  async findOne(id: string): Promise<ApiResponse<Language>> {
    return getCache(
      this.redis,
      languagesCache.itemKey(this.companyId, id),
      languagesCache.ttlSeconds,
      async () =>
        apiSuccess('Language fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateLanguageDto: UpdateLanguageDto,
  ): Promise<ApiResponse<Language>> {
    const language = await this.getOne(id);
    const saved = await this.languagesRepository.save(
      this.languagesRepository.merge(language, updateLanguageDto),
    );

    await this.clearLanguageCache(id);
    return apiSuccess('Language updated successfully', saved);
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.languagesRepository,
      { id, companyId: this.companyId },
      'Language not found',
    );

    await this.clearLanguageCache(id);
    return apiSuccessMessage('Language deleted successfully');
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.languagesRepository.existsBy({
      id,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Language not found'));
    }
  }

  private async loadLanguages(
    query: QueryLanguageDto,
  ): Promise<ApiResponse<PaginatedData<Language>>> {
    const where: FindOptionsWhere<Language> = {
      companyId: this.companyId,
    };

    if (query.name) {
      where.name = ilikePrefix(query.name);
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const data = await paginateRepository(this.languagesRepository, query, {
      where,
      order: { updatedAt: 'DESC' },
    });

    return apiSuccess('Languages fetched successfully', data);
  }

  private async getOne(id: string): Promise<Language> {
    const language = await this.languagesRepository.findOne({
      where: { id, companyId: this.companyId },
    });

    if (!language) {
      throw new NotFoundException(apiError('Language not found'));
    }

    return language;
  }

  private clearLanguageCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      languagesCache.listKeysKey(this.companyId),
      ...(id ? [languagesCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
