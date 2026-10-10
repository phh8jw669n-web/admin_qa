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
import { candidateExamCache } from '../candidates/candidate-exam.cache';
import { LanguagesService } from '../languages/languages.service';
import { Test } from '../tests/entities/test.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { Category } from './entities/category.entity';
import { categoriesCache } from './categories.cache';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categoriesRepository: Repository<Category>,
    @InjectRepository(Test)
    private readonly testsRepository: Repository<Test>,
    private readonly companyContext: CompanyContextService,
    private readonly languagesService: LanguagesService,
    private readonly redis: RedisService,
  ) {}

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<ApiResponse<Category>> {
    await this.assertLanguage(createCategoryDto.languageId);

    const category = await this.categoriesRepository.save(
      this.categoriesRepository.create({
        companyId: this.companyId,
        ...createCategoryDto,
      }),
    );

    await this.clearCategoryCache();
    return apiSuccess('Category created successfully', category);
  }

  async findAll(
    query: QueryCategoryDto,
  ): Promise<ApiResponse<PaginatedData<Category>>> {
    const load = async () => {
      const where: FindOptionsWhere<Category> = {
        companyId: this.companyId,
      };

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.ranking !== undefined) {
        where.ranking = query.ranking;
      }

      if (query.languageId) {
        where.languageId = query.languageId;
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(this.categoriesRepository, query, {
        where,
        order: { ranking: 'ASC', updatedAt: 'DESC' },
      });

      return apiSuccess('Categories fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      categoriesCache.listKeysKey(this.companyId),
      categoriesCache.ttlSeconds,
      categoriesCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Category>> {
    return getCache(
      this.redis,
      categoriesCache.itemKey(this.companyId, id),
      categoriesCache.ttlSeconds,
      async () =>
        apiSuccess('Category fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<ApiResponse<Category>> {
    const category = await this.getOne(id);
    await this.assertLanguage(updateCategoryDto.languageId);
    const saved = await this.categoriesRepository.save(
      this.categoriesRepository.merge(category, updateCategoryDto),
    );

    await this.clearCategoryCache(id);
    return apiSuccess('Category updated successfully', saved);
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.categoriesRepository,
      { id, companyId: this.companyId },
      'Category not found',
    );

    await this.clearCategoryCache(id);
    return apiSuccessMessage('Category deleted successfully');
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.categoriesRepository.existsBy({
      id,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Category not found'));
    }
  }

  private async getOne(id: string): Promise<Category> {
    const category = await this.categoriesRepository.findOne({
      where: { id, companyId: this.companyId },
    });

    if (!category) {
      throw new NotFoundException(apiError('Category not found'));
    }

    return category;
  }

  private async assertLanguage(languageId?: string | null): Promise<void> {
    if (!languageId) {
      return;
    }

    await this.languagesService.assertExists(languageId);
  }

  private async clearCategoryCache(id?: string): Promise<void> {
    const tests = id
      ? await this.testsRepository.find({
          where: { companyId: this.companyId, categoryId: id },
          select: { id: true },
        })
      : [];

    await clearCached(
      this.redis,
      categoriesCache.listKeysKey(this.companyId),
      ...(id ? [categoriesCache.itemKey(this.companyId, id)] : []),
      ...tests.map((test) =>
        candidateExamCache.detailsKey(this.companyId, test.id),
      ),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
