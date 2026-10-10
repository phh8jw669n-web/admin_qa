import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Not, Repository } from 'typeorm';
import {
  clearCached,
  getCache,
  getCacheList,
} from '../../common/cache/redis-cache.util';
import { PaginatedData } from '../../common/types/paginated-response.type';
import { RedisService } from '../../redis/redis.service';
import { apiError } from '../../common/utils/api-response.util';
import { ilikePrefix } from '../../common/utils/ilike.util';
import { paginateRepository } from '../../common/utils/pagination.util';
import { softDeleteIfExists } from '../../common/utils/soft-delete.util';
import { CreateTemplateDto } from './dto/create-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { Template } from './entities/template.entity';
import { templatesCache } from './templates.cache';

@Injectable()
export class TemplatesService {
  constructor(
    @InjectRepository(Template)
    private readonly templatesRepository: Repository<Template>,
    private readonly redis: RedisService,
  ) {}

  async create(createTemplateDto: CreateTemplateDto): Promise<Template> {
    await this.assertRankingAvailable(createTemplateDto.ranking);

    const template = await this.templatesRepository.save(
      this.templatesRepository.create(createTemplateDto),
    );
    await this.clearTemplateCache();
    return template;
  }

  async findAll(query: QueryTemplateDto): Promise<PaginatedData<Template>> {
    const load = async () => {
      const where: FindOptionsWhere<Template> = {};

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.ranking !== undefined) {
        where.ranking = query.ranking;
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      return paginateRepository(this.templatesRepository, query, {
        where,
        order: { ranking: 'ASC', updatedAt: 'DESC' },
      });
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      templatesCache.listKeysKey(),
      templatesCache.ttlSeconds,
      templatesCache.listKey(query),
      load,
    );
  }

  async findOne(id: string): Promise<Template> {
    return getCache(
      this.redis,
      templatesCache.itemKey(id),
      templatesCache.ttlSeconds,
      () => this.getOne(id),
    );
  }

  async update(
    id: string,
    updateTemplateDto: UpdateTemplateDto,
  ): Promise<Template> {
    const template = await this.getOne(id);

    if (
      updateTemplateDto.ranking !== undefined &&
      updateTemplateDto.ranking !== template.ranking
    ) {
      await this.assertRankingAvailable(updateTemplateDto.ranking, id);
    }

    const saved = await this.templatesRepository.save(
      this.templatesRepository.merge(template, updateTemplateDto),
    );
    await this.clearTemplateCache(id);
    return saved;
  }

  async remove(id: string): Promise<void> {
    await softDeleteIfExists(
      this.templatesRepository,
      { id },
      'Template not found',
    );
    await this.clearTemplateCache(id);
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.templatesRepository.existsBy({ id });

    if (!exists) {
      throw new NotFoundException(apiError('Template not found'));
    }
  }

  private clearTemplateCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      templatesCache.listKeysKey(),
      ...(id ? [templatesCache.itemKey(id)] : []),
    );
  }

  private async assertRankingAvailable(ranking: number, excludeId?: string) {
    const where: FindOptionsWhere<Template> = { ranking };

    if (excludeId) {
      where.id = Not(excludeId);
    }

    const exists = await this.templatesRepository.existsBy(where);

    if (exists) {
      throw new ConflictException(
        apiError(`Ranking ${ranking} is already in use`),
      );
    }
  }

  private async getOne(id: string): Promise<Template> {
    const template = await this.templatesRepository.findOne({ where: { id } });

    if (!template) {
      throw new NotFoundException(apiError('Template not found'));
    }

    return template;
  }
}
