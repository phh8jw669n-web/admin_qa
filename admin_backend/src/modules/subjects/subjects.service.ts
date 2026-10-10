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
import { CreateSubjectDto } from './dto/create-subject.dto';
import { QuerySubjectDto } from './dto/query-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { Subject } from './entities/subject.entity';
import { subjectsCache } from './subjects.cache';

@Injectable()
export class SubjectsService {
  constructor(
    @InjectRepository(Subject)
    private readonly subjectsRepository: Repository<Subject>,
    private readonly companyContext: CompanyContextService,
    private readonly languagesService: LanguagesService,
    private readonly categoriesService: CategoriesService,
    private readonly redis: RedisService,
  ) {}

  async create(
    createSubjectDto: CreateSubjectDto,
  ): Promise<ApiResponse<Subject>> {
    await this.assertLanguage(createSubjectDto.languageId);

    const subject = await this.subjectsRepository.save(
      this.subjectsRepository.create({
        companyId: this.companyId,
        ...createSubjectDto,
      }),
    );

    await this.clearSubjectCache();
    return apiSuccess('Subject created successfully', subject);
  }

  async findAll(
    query: QuerySubjectDto,
  ): Promise<ApiResponse<PaginatedData<Subject>>> {
    if (query.name) {
      return this.loadSubjects(query);
    }

    return getCacheList(
      this.redis,
      subjectsCache.listKeysKey(this.companyId),
      subjectsCache.ttlSeconds,
      subjectsCache.listKey(this.companyId, query),
      () => this.loadSubjects(query),
    );
  }

  async findOne(id: string): Promise<ApiResponse<Subject>> {
    return getCache(
      this.redis,
      subjectsCache.itemKey(this.companyId, id),
      subjectsCache.ttlSeconds,
      async () =>
        apiSuccess('Subject fetched successfully', await this.getOne(id)),
    );
  }
  private async loadSubjects(
    query: QuerySubjectDto,
  ): Promise<ApiResponse<PaginatedData<Subject>>> {
    if (!query.categoryId) {
      const where: FindOptionsWhere<Subject> = {
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

      const data = await paginateRepository(this.subjectsRepository, query, {
        where,
        order: { ranking: 'ASC', updatedAt: 'DESC' },
      });

      return apiSuccess('Subjects fetched successfully', data);
    }

    await this.categoriesService.assertExists(query.categoryId);

    const subjects = this.subjectsRepository
      .createQueryBuilder('subject')
      .where('subject.companyId = :companyId', { companyId: this.companyId })
      .andWhere((builder) => {
        const relatedSubjects = builder
          .subQuery()
          .select('mapping.subjectId')
          .from(CategorySubjectTopicMapping, 'mapping')
          .where('mapping.companyId = :companyId')
          .andWhere('mapping.categoryId = :categoryId')
          .getQuery();

        return `subject.id IN ${relatedSubjects}`;
      })
      .setParameter('categoryId', query.categoryId);

    this.applySubjectFilters(subjects, query);

    const data = await paginateQueryBuilder(
      subjects
        .orderBy('subject.ranking', 'ASC')
        .addOrderBy('subject.updatedAt', 'DESC'),
      query,
    );

    return apiSuccess('Subjects fetched successfully', data);
  }

  async update(
    id: string,
    updateSubjectDto: UpdateSubjectDto,
  ): Promise<ApiResponse<Subject>> {
    const subject = await this.getOne(id);
    await this.assertLanguage(updateSubjectDto.languageId);
    const saved = await this.subjectsRepository.save(
      this.subjectsRepository.merge(subject, updateSubjectDto),
    );

    await this.clearSubjectCache(id);
    return apiSuccess('Subject updated successfully', saved);
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.subjectsRepository,
      { id, companyId: this.companyId },
      'Subject not found',
    );

    await this.clearSubjectCache(id);
    return apiSuccessMessage('Subject deleted successfully');
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.subjectsRepository.existsBy({
      id,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Subject not found'));
    }
  }

  private async getOne(id: string): Promise<Subject> {
    const subject = await this.subjectsRepository.findOne({
      where: { id, companyId: this.companyId },
    });

    if (!subject) {
      throw new NotFoundException(apiError('Subject not found'));
    }

    return subject;
  }

  private applySubjectFilters(
    subjects: SelectQueryBuilder<Subject>,
    query: QuerySubjectDto,
  ): void {
    if (query.name) {
      subjects.andWhere('subject.name ILIKE :name', {
        name: `${escapeIlike(query.name)}%`,
      });
    }

    if (query.ranking !== undefined) {
      subjects.andWhere('subject.ranking = :ranking', {
        ranking: query.ranking,
      });
    }

    if (query.languageId) {
      subjects.andWhere('subject.languageId = :languageId', {
        languageId: query.languageId,
      });
    }

    if (query.isActive !== undefined) {
      subjects.andWhere('subject.isActive = :isActive', {
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

  private clearSubjectCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      subjectsCache.listKeysKey(this.companyId),
      ...(id ? [subjectsCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
