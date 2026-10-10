import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
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
import { CreateGroupDto } from './dto/create-group.dto';
import { QueryGroupDto } from './dto/query-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { Group } from './entities/group.entity';
import { groupsCache } from './groups.cache';

@Injectable()
export class GroupsService {
  constructor(
    @InjectRepository(Group)
    private readonly groupsRepository: Repository<Group>,
    private readonly companyContext: CompanyContextService,
    private readonly redis: RedisService,
  ) {}

  async create(createGroupDto: CreateGroupDto): Promise<ApiResponse<Group>> {
    const group = await this.groupsRepository.save(
      this.groupsRepository.create({
        companyId: this.companyId,
        ...createGroupDto,
      }),
    );

    await this.clearGroupCache();
    return apiSuccess('Group created successfully', group);
  }

  async findAll(
    query: QueryGroupDto,
  ): Promise<ApiResponse<PaginatedData<Group>>> {
    const load = async () => {
      const where: FindOptionsWhere<Group> = {
        companyId: this.companyId,
      };

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(this.groupsRepository, query, {
        where,
        order: { updatedAt: 'DESC' },
      });

      return apiSuccess('Groups fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      groupsCache.listKeysKey(this.companyId),
      groupsCache.ttlSeconds,
      groupsCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Group>> {
    return getCache(
      this.redis,
      groupsCache.itemKey(this.companyId, id),
      groupsCache.ttlSeconds,
      async () =>
        apiSuccess('Group fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateGroupDto: UpdateGroupDto,
  ): Promise<ApiResponse<Group>> {
    const group = await this.getOne(id);
    const saved = await this.groupsRepository.save(
      this.groupsRepository.merge(group, updateGroupDto),
    );

    await this.clearGroupCache(id);
    return apiSuccess('Group updated successfully', saved);
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.groupsRepository,
      { id, companyId: this.companyId },
      'Group not found',
    );

    await this.clearGroupCache(id);
    return apiSuccessMessage('Group deleted successfully');
  }

  async assertAllExist(ids: string[]): Promise<void> {
    const uniqueIds = [...new Set(ids)];
    const count = await this.groupsRepository.count({
      where: { id: In(uniqueIds), companyId: this.companyId },
    });

    if (count !== uniqueIds.length) {
      throw new NotFoundException(apiError('Group not found'));
    }
  }

  private async getOne(id: string): Promise<Group> {
    const group = await this.groupsRepository.findOne({
      where: { id, companyId: this.companyId },
    });

    if (!group) {
      throw new NotFoundException(apiError('Group not found'));
    }

    return group;
  }

  private clearGroupCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      groupsCache.listKeysKey(this.companyId),
      ...(id ? [groupsCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
