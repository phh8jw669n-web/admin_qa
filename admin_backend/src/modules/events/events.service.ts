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
import { softDeleteIfExists } from '../../common/utils/soft-delete.util';
import { CreateEventDto } from './dto/create-event.dto';
import { QueryEventDto } from './dto/query-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { Event } from './entities/event.entity';
import { eventsCache } from './events.cache';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private readonly eventsRepository: Repository<Event>,
    private readonly companyContext: CompanyContextService,
    private readonly redis: RedisService,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<ApiResponse<Event>> {
    this.assertValidEventWindow(
      createEventDto.eventOpeningAt,
      createEventDto.eventClosingAt,
    );

    const event = await this.eventsRepository.save(
      this.eventsRepository.create({
        companyId: this.companyId,
        ...createEventDto,
      }),
    );

    await this.clearEventCache();
    return apiSuccess('Event created successfully', event);
  }

  async findAll(
    query: QueryEventDto,
  ): Promise<ApiResponse<PaginatedData<Event>>> {
    const load = async () => {
      const where: FindOptionsWhere<Event> = {
        companyId: this.companyId,
      };

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.eventCode) {
        where.eventCode = ilikePrefix(query.eventCode);
      }

      if (query.examType) {
        where.examType = query.examType;
      }

      if (query.eventType) {
        where.eventType = query.eventType;
      }

      if (query.isPublish !== undefined) {
        where.isPublish = query.isPublish;
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(this.eventsRepository, query, {
        where,
        order: { updatedAt: 'DESC' },
      });

      return apiSuccess('Events fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      eventsCache.listKeysKey(this.companyId),
      eventsCache.ttlSeconds,
      eventsCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Event>> {
    return getCache(
      this.redis,
      eventsCache.itemKey(this.companyId, id),
      eventsCache.ttlSeconds,
      async () =>
        apiSuccess('Event fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateEventDto: UpdateEventDto,
  ): Promise<ApiResponse<Event>> {
    const event = await this.getOne(id);

    this.assertValidEventWindow(
      updateEventDto.eventOpeningAt ?? event.eventOpeningAt,
      updateEventDto.eventClosingAt ?? event.eventClosingAt,
    );

    const saved = await this.eventsRepository.save(
      this.eventsRepository.merge(event, updateEventDto),
    );

    await this.clearEventCache(id);
    return apiSuccess('Event updated successfully', saved);
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.eventsRepository,
      { id, companyId: this.companyId },
      'Event not found',
    );

    await this.clearEventCache(id);
    return apiSuccessMessage('Event deleted successfully');
  }

  private assertValidEventWindow(
    eventOpeningAt: string | Date,
    eventClosingAt: string | Date,
  ): void {
    const openingAt = new Date(eventOpeningAt);
    const closingAt = new Date(eventClosingAt);

    if (
      Number.isNaN(openingAt.getTime()) ||
      Number.isNaN(closingAt.getTime())
    ) {
      return;
    }

    if (closingAt <= openingAt) {
      throw new BadRequestException(
        apiError('Event closing time must be after opening time'),
      );
    }
  }

  private async getOne(id: string): Promise<Event> {
    const event = await this.eventsRepository.findOne({
      where: { id, companyId: this.companyId },
    });

    if (!event) {
      throw new NotFoundException(apiError('Event not found'));
    }

    return event;
  }

  private clearEventCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      eventsCache.listKeysKey(this.companyId),
      ...(id ? [eventsCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
