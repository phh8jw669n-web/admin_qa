import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { isEndTimeAfterStartTime } from '../../common/utils/time.util';
import {
  SESSION_CODE_PAD_LENGTH,
  SESSION_CODE_PREFIX,
} from './constants/sessions.constants';
import { CreateSessionDto } from './dto/create-session.dto';
import { QuerySessionDto } from './dto/query-session.dto';
import { UpdateSessionDto } from './dto/update-session.dto';
import { Session } from './entities/session.entity';
import { sessionsCache } from './sessions.cache';

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
    private readonly companyContext: CompanyContextService,
    private readonly redis: RedisService,
  ) {}

  async create(
    createSessionDto: CreateSessionDto,
  ): Promise<ApiResponse<Session>> {
    this.assertValidDateRange(
      createSessionDto.startDate,
      createSessionDto.endDate,
    );
    this.assertValidTimeRange(
      createSessionDto.startTime,
      createSessionDto.endTime,
    );

    const session = await this.sessionsRepository.save(
      this.sessionsRepository.create({
        companyId: this.companyId,
        ...createSessionDto,
        code: await this.generateUniqueCode(),
      }),
    );

    await this.clearSessionCache();
    return apiSuccess('Session created successfully', session);
  }

  async findAll(
    query: QuerySessionDto,
  ): Promise<ApiResponse<PaginatedData<Session>>> {
    const load = async () => {
      const where: FindOptionsWhere<Session> = {
        companyId: this.companyId,
      };

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.code) {
        where.code = ilikePrefix(query.code);
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(this.sessionsRepository, query, {
        where,
        order: { updatedAt: 'DESC' },
      });

      return apiSuccess('Sessions fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      sessionsCache.listKeysKey(this.companyId),
      sessionsCache.ttlSeconds,
      sessionsCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Session>> {
    return getCache(
      this.redis,
      sessionsCache.itemKey(this.companyId, id),
      sessionsCache.ttlSeconds,
      async () =>
        apiSuccess('Session fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateSessionDto: UpdateSessionDto,
  ): Promise<ApiResponse<Session>> {
    const session = await this.getOne(id);

    this.assertValidDateRange(
      updateSessionDto.startDate ?? session.startDate,
      updateSessionDto.endDate ?? session.endDate,
    );
    this.assertValidTimeRange(
      updateSessionDto.startTime ?? session.startTime,
      updateSessionDto.endTime ?? session.endTime,
    );

    const saved = await this.sessionsRepository.save(
      this.sessionsRepository.merge(session, updateSessionDto),
    );

    await this.clearSessionCache(id);
    return apiSuccess('Session updated successfully', saved);
  }

  async remove(id: string): Promise<ApiResponse> {
    await this.getOne(id);
    const result = await this.sessionsRepository.update(
      { id, companyId: this.companyId },
      {
        isActive: false,
        deletedAt: new Date(),
      },
    );

    if (!result.affected) {
      throw new NotFoundException(apiError('Session not found'));
    }

    await this.clearSessionCache(id);
    return apiSuccessMessage('Session deleted successfully');
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.sessionsRepository.existsBy({
      id,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Session not found'));
    }
  }

  private assertValidDateRange(
    startDate: string | Date,
    endDate: string | Date,
  ): void {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return;
    }

    if (end <= start) {
      throw new BadRequestException(
        apiError('End date must be after start date'),
      );
    }
  }

  private assertValidTimeRange(startTime: string, endTime: string): void {
    if (!isEndTimeAfterStartTime(startTime, endTime)) {
      throw new BadRequestException(
        apiError('End time must be after start time'),
      );
    }
  }

  private async generateUniqueCode(): Promise<string> {
    const prefix = SESSION_CODE_PREFIX;
    const padLength = SESSION_CODE_PAD_LENGTH;

    const result = await this.sessionsRepository
      .createQueryBuilder('session')
      .withDeleted()
      .select(
        `
        COALESCE(
          MAX(
            CAST(
              SUBSTRING(session.code FROM '[0-9]+$')
              AS INTEGER
            )
          ),
          0
        )
        `,
        'maxSequence',
      )
      .where('session.company_id = :companyId', { companyId: this.companyId })
      .andWhere('session.code LIKE :pattern', {
        pattern: `${prefix}-%`,
      })
      .getRawOne<{ maxSequence: string }>();

    const nextSequence = Number(result?.maxSequence ?? 0) + 1;
    return `${prefix}-${String(nextSequence).padStart(padLength, '0')}`;
  }

  private async getOne(id: string): Promise<Session> {
    const session = await this.sessionsRepository.findOne({
      where: { id, companyId: this.companyId },
    });

    if (!session) {
      throw new NotFoundException(apiError('Session not found'));
    }

    return session;
  }

  private clearSessionCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      sessionsCache.listKeysKey(this.companyId),
      ...(id ? [sessionsCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
