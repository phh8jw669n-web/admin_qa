import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, SelectQueryBuilder } from 'typeorm';
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
import { escapeIlike, ilikePrefix } from '../../common/utils/ilike.util';
import {
  paginateQueryBuilder,
  paginateRepository,
} from '../../common/utils/pagination.util';
import { softDeleteIfExists } from '../../common/utils/soft-delete.util';
import { CategoriesService } from '../categories/categories.service';
import { CategorySubjectTopicMapping } from '../category-subject-topic-mappings/entities/category-subject-topic-mapping.entity';
import { LanguagesService } from '../languages/languages.service';
import { SubjectsService } from '../subjects/subjects.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { QueryTopicDto } from './dto/query-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';
import { Topic } from './entities/topic.entity';
import { topicsCache } from './topics.cache';

@Injectable()
export class TopicsService {
  constructor(
    @InjectRepository(Topic)
    private readonly topicsRepository: Repository<Topic>,
    private readonly companyContext: CompanyContextService,
    private readonly languagesService: LanguagesService,
    private readonly categoriesService: CategoriesService,
    private readonly subjectsService: SubjectsService,
    private readonly redis: RedisService,
  ) {}

  async create(createTopicDto: CreateTopicDto): Promise<ApiResponse<Topic>> {
    await this.assertLanguage(createTopicDto.languageId);

    const topic = await this.topicsRepository.save(
      this.topicsRepository.create({
        companyId: this.companyId,
        ...createTopicDto,
      }),
    );

    await this.clearTopicCache();
    return apiSuccess('Topic created successfully', topic);
  }

  async findAll(
    query: QueryTopicDto,
  ): Promise<ApiResponse<PaginatedData<Topic>>> {
    if (query.name) {
      return this.loadTopics(query);
    }

    return getCacheList(
      this.redis,
      topicsCache.listKeysKey(this.companyId),
      topicsCache.ttlSeconds,
      topicsCache.listKey(this.companyId, query),
      () => this.loadTopics(query),
    );
  }

  async findOne(id: string): Promise<ApiResponse<Topic>> {
    return getCache(
      this.redis,
      topicsCache.itemKey(this.companyId, id),
      topicsCache.ttlSeconds,
      async () =>
        apiSuccess('Topic fetched successfully', await this.getOne(id)),
    );
  }

  private async loadTopics(
    query: QueryTopicDto,
  ): Promise<ApiResponse<PaginatedData<Topic>>> {
    if (!query.categoryId && !query.subjectId) {
      const where: FindOptionsWhere<Topic> = {
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

      const data = await paginateRepository(this.topicsRepository, query, {
        where,
        order: { ranking: 'ASC', updatedAt: 'DESC' },
      });

      return apiSuccess('Topics fetched successfully', data);
    }

    await Promise.all([
      query.categoryId
        ? this.categoriesService.assertExists(query.categoryId)
        : Promise.resolve(),
      query.subjectId
        ? this.subjectsService.assertExists(query.subjectId)
        : Promise.resolve(),
    ]);

    const topics = this.topicsRepository
      .createQueryBuilder('topic')
      .where('topic.companyId = :companyId', { companyId: this.companyId })
      .andWhere((builder) => {
        const relatedTopics = builder
          .subQuery()
          .select('mapping.topicId')
          .from(CategorySubjectTopicMapping, 'mapping')
          .where('mapping.companyId = :companyId');

        if (query.categoryId) {
          relatedTopics.andWhere('mapping.categoryId = :categoryId');
        }

        if (query.subjectId) {
          relatedTopics.andWhere('mapping.subjectId = :subjectId');
        }

        return `topic.id IN ${relatedTopics.getQuery()}`;
      });

    if (query.categoryId) {
      topics.setParameter('categoryId', query.categoryId);
    }

    if (query.subjectId) {
      topics.setParameter('subjectId', query.subjectId);
    }

    this.applyTopicFilters(topics, query);

    const data = await paginateQueryBuilder(
      topics
        .orderBy('topic.ranking', 'ASC')
        .addOrderBy('topic.updatedAt', 'DESC'),
      query,
    );

    return apiSuccess('Topics fetched successfully', data);
  }

  async update(
    id: string,
    updateTopicDto: UpdateTopicDto,
  ): Promise<ApiResponse<Topic>> {
    const topic = await this.getOne(id);
    await this.assertLanguage(updateTopicDto.languageId);
    const saved = await this.topicsRepository.save(
      this.topicsRepository.merge(topic, updateTopicDto),
    );

    await this.clearTopicCache(id);
    return apiSuccess('Topic updated successfully', saved);
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.topicsRepository,
      { id, companyId: this.companyId },
      'Topic not found',
    );

    await this.clearTopicCache(id);
    return apiSuccessMessage('Topic deleted successfully');
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.topicsRepository.existsBy({
      id,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Topic not found'));
    }
  }

  private async getOne(id: string): Promise<Topic> {
    const topic = await this.topicsRepository.findOne({
      where: { id, companyId: this.companyId },
    });

    if (!topic) {
      throw new NotFoundException(apiError('Topic not found'));
    }

    return topic;
  }

  private applyTopicFilters(
    topics: SelectQueryBuilder<Topic>,
    query: QueryTopicDto,
  ): void {
    if (query.name) {
      topics.andWhere('topic.name ILIKE :name', {
        name: `${escapeIlike(query.name)}%`,
      });
    }

    if (query.ranking !== undefined) {
      topics.andWhere('topic.ranking = :ranking', {
        ranking: query.ranking,
      });
    }

    if (query.languageId) {
      topics.andWhere('topic.languageId = :languageId', {
        languageId: query.languageId,
      });
    }

    if (query.isActive !== undefined) {
      topics.andWhere('topic.isActive = :isActive', {
        isActive: query.isActive,
      });
    }
  }

  private async assertLanguage(languageId?: string | null): Promise<void> {
    if (!languageId) {
      return;
    }

    await this.languagesService.assertExists(languageId);
  }

  private clearTopicCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      topicsCache.listKeysKey(this.companyId),
      ...(id ? [topicsCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
