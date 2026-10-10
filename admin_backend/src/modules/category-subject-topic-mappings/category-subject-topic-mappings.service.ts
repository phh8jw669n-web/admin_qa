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
import { paginateRepository } from '../../common/utils/pagination.util';
import { softDeleteIfExists } from '../../common/utils/soft-delete.util';
import { CategoriesService } from '../categories/categories.service';
import { subjectsCache } from '../subjects/subjects.cache';
import { SubjectsService } from '../subjects/subjects.service';
import { topicsCache } from '../topics/topics.cache';
import { TopicsService } from '../topics/topics.service';
import { CreateCategorySubjectTopicMappingDto } from './dto/create-category-subject-topic-mapping.dto';
import { QueryCategorySubjectTopicMappingDto } from './dto/query-category-subject-topic-mapping.dto';
import { UpdateCategorySubjectTopicMappingDto } from './dto/update-category-subject-topic-mapping.dto';
import { categorySubjectTopicMappingsCache } from './category-subject-topic-mappings.cache';
import { CategorySubjectTopicMapping } from './entities/category-subject-topic-mapping.entity';

@Injectable()
export class CategorySubjectTopicMappingsService {
  constructor(
    @InjectRepository(CategorySubjectTopicMapping)
    private readonly mappingsRepository: Repository<CategorySubjectTopicMapping>,
    private readonly companyContext: CompanyContextService,
    private readonly categoriesService: CategoriesService,
    private readonly subjectsService: SubjectsService,
    private readonly topicsService: TopicsService,
    private readonly redis: RedisService,
  ) {}

  async create(
    createDto: CreateCategorySubjectTopicMappingDto,
  ): Promise<ApiResponse<CategorySubjectTopicMapping>> {
    await this.assertRelations(
      createDto.categoryId,
      createDto.subjectId,
      createDto.topicId,
    );

    const mapping = await this.mappingsRepository.save(
      this.mappingsRepository.create({
        companyId: this.companyId,
        ...createDto,
      }),
    );

    await this.clearMappingCache();
    return apiSuccess(
      'Category subject topic mapping created successfully',
      await this.getOne(mapping.id),
    );
  }

  async findAll(
    query: QueryCategorySubjectTopicMappingDto,
  ): Promise<ApiResponse<PaginatedData<CategorySubjectTopicMapping>>> {
    return getCacheList(
      this.redis,
      categorySubjectTopicMappingsCache.listKeysKey(this.companyId),
      categorySubjectTopicMappingsCache.ttlSeconds,
      categorySubjectTopicMappingsCache.listKey(this.companyId, query),
      async () => {
        const where: FindOptionsWhere<CategorySubjectTopicMapping> = {
          companyId: this.companyId,
        };

        if (query.categoryId) {
          where.categoryId = query.categoryId;
        }

        if (query.subjectId) {
          where.subjectId = query.subjectId;
        }

        if (query.topicId) {
          where.topicId = query.topicId;
        }

        if (query.ranking !== undefined) {
          where.ranking = query.ranking;
        }

        if (query.isActive !== undefined) {
          where.isActive = query.isActive;
        }

        const data = await paginateRepository(this.mappingsRepository, query, {
          where,
          relations: { category: true, subject: true, topic: true },
          order: { ranking: 'ASC', updatedAt: 'DESC' },
        });

        return apiSuccess(
          'Category subject topic mappings fetched successfully',
          data,
        );
      },
    );
  }

  async findOne(id: string): Promise<ApiResponse<CategorySubjectTopicMapping>> {
    return getCache(
      this.redis,
      categorySubjectTopicMappingsCache.itemKey(this.companyId, id),
      categorySubjectTopicMappingsCache.ttlSeconds,
      async () =>
        apiSuccess(
          'Category subject topic mapping fetched successfully',
          await this.getOne(id),
        ),
    );
  }

  async update(
    id: string,
    updateDto: UpdateCategorySubjectTopicMappingDto,
  ): Promise<ApiResponse<CategorySubjectTopicMapping>> {
    const mapping = await this.getOne(id);
    const relationsChanged =
      (updateDto.categoryId !== undefined &&
        updateDto.categoryId !== mapping.categoryId) ||
      (updateDto.subjectId !== undefined &&
        updateDto.subjectId !== mapping.subjectId) ||
      (updateDto.topicId !== undefined &&
        updateDto.topicId !== mapping.topicId);

    if (relationsChanged) {
      await this.assertRelations(
        updateDto.categoryId ?? mapping.categoryId,
        updateDto.subjectId ?? mapping.subjectId,
        updateDto.topicId ?? mapping.topicId,
      );
    }

    const saved = await this.mappingsRepository.save(
      this.mappingsRepository.merge(mapping, updateDto),
    );

    await this.clearMappingCache(id);
    return apiSuccess(
      'Category subject topic mapping updated successfully',
      relationsChanged ? await this.getOne(id) : saved,
    );
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.mappingsRepository,
      { id, companyId: this.companyId },
      'Category subject topic mapping not found',
    );

    await this.clearMappingCache(id);
    return apiSuccessMessage(
      'Category subject topic mapping deleted successfully',
    );
  }

  private async assertRelations(
    categoryId: string,
    subjectId: string,
    topicId: string,
  ): Promise<void> {
    await Promise.all([
      this.categoriesService.assertExists(categoryId),
      this.subjectsService.assertExists(subjectId),
      this.topicsService.assertExists(topicId),
    ]);
  }

  private async getOne(id: string): Promise<CategorySubjectTopicMapping> {
    const mapping = await this.mappingsRepository.findOne({
      where: { id, companyId: this.companyId },
      relations: { category: true, subject: true, topic: true },
    });

    if (!mapping) {
      throw new NotFoundException(
        apiError('Category subject topic mapping not found'),
      );
    }

    return mapping;
  }

  private async clearMappingCache(id?: string): Promise<void> {
    await clearCached(
      this.redis,
      categorySubjectTopicMappingsCache.listKeysKey(this.companyId),
      ...(id
        ? [categorySubjectTopicMappingsCache.itemKey(this.companyId, id)]
        : []),
    );
    await clearCached(this.redis, subjectsCache.listKeysKey(this.companyId));
    await clearCached(this.redis, topicsCache.listKeysKey(this.companyId));
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
