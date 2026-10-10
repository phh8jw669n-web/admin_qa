import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  ArrayContains,
  ArrayOverlap,
  FindOptionsWhere,
  In,
  Repository,
} from 'typeorm';
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
import {
  generatePassword,
  hashPassword,
} from '../../common/utils/password.util';
import { GroupsService } from '../groups/groups.service';
import { Group } from '../groups/entities/group.entity';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { QueryCandidateDto } from './dto/query-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';
import { Candidate } from './entities/candidate.entity';
import { candidatesCache } from './candidates.cache';

@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(Candidate)
    private readonly candidatesRepository: Repository<Candidate>,
    private readonly companyContext: CompanyContextService,
    private readonly groupsService: GroupsService,
    private readonly redis: RedisService,
  ) {}

  async create(
    createCandidateDto: CreateCandidateDto,
  ): Promise<ApiResponse<Candidate>> {
    const { password, ...rest } = createCandidateDto;
    await this.groupsService.assertAllExist(rest.groupIds);

    const candidate = await this.candidatesRepository.save(
      this.candidatesRepository.create({
        companyId: this.companyId,
        ...rest,
        groups: this.toGroups(rest.groupIds),
        passwordHash: await hashPassword(password ?? generatePassword()),
      }),
    );

    await this.clearCandidateCache();
    return apiSuccess('Candidate created successfully', candidate);
  }

  async findAll(
    query: QueryCandidateDto,
  ): Promise<ApiResponse<PaginatedData<Candidate>>> {
    const load = async () => {
      const where: FindOptionsWhere<Candidate> = {
        companyId: this.companyId,
      };

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.email) {
        where.email = ilikePrefix(query.email);
      }

      if (query.enrollmentNumber) {
        where.enrollmentNumber = ilikePrefix(query.enrollmentNumber);
      }

      if (query.groupId) {
        where.groupIds = ArrayContains([query.groupId]);
      }

      if (query.gender) {
        where.gender = query.gender;
      }

      if (query.paymentStatus) {
        where.paymentStatus = query.paymentStatus;
      }

      if (query.isEnroll !== undefined) {
        where.isEnroll = query.isEnroll;
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(this.candidatesRepository, query, {
        where,
        order: { updatedAt: 'DESC' },
      });

      return apiSuccess('Candidates fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      candidatesCache.listKeysKey(this.companyId),
      candidatesCache.ttlSeconds,
      candidatesCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Candidate>> {
    return getCache(
      this.redis,
      candidatesCache.itemKey(this.companyId, id),
      candidatesCache.ttlSeconds,
      async () =>
        apiSuccess('Candidate fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateCandidateDto: UpdateCandidateDto,
  ): Promise<ApiResponse<Candidate>> {
    const candidate = await this.getOne(id);
    const { password, ...rest } = updateCandidateDto;

    if (rest.groupIds) {
      await this.groupsService.assertAllExist(rest.groupIds);
    }

    const saved = await this.candidatesRepository.save(
      this.candidatesRepository.merge(candidate, {
        ...rest,
        ...(rest.groupIds ? { groups: this.toGroups(rest.groupIds) } : {}),
        ...(password ? { passwordHash: await hashPassword(password) } : {}),
      }),
    );

    await this.clearCandidateCache(id);
    return apiSuccess('Candidate updated successfully', saved);
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.candidatesRepository,
      { id, companyId: this.companyId },
      'Candidate not found',
    );

    await this.clearCandidateCache(id);
    return apiSuccessMessage('Candidate deleted successfully');
  }

  findByEmails(
    emails: string[],
  ): Promise<Pick<Candidate, 'id' | 'email' | 'groupIds'>[]> {
    return this.candidatesRepository.find({
      select: { id: true, email: true, groupIds: true },
      where: {
        email: In(emails),
        companyId: this.companyId,
      },
    });
  }

  findByGroupIds(
    groupIds: string[],
  ): Promise<Pick<Candidate, 'id' | 'groupIds'>[]> {
    return this.candidatesRepository.find({
      select: { id: true, groupIds: true },
      where: {
        companyId: this.companyId,
        groupIds: ArrayOverlap(groupIds),
      },
    });
  }

  findByEnrollmentNumberAndCompanyId(
    enrollmentNumber: string,
    companyId: string,
  ): Promise<Candidate | null> {
    return this.candidatesRepository.findOne({
      where: { enrollmentNumber, companyId },
    });
  }

  findActiveById(id: string): Promise<Candidate | null> {
    return this.candidatesRepository.findOne({
      where: { id, isActive: true },
    });
  }

  async saveLoginSession(
    candidateId: string,
    refreshTokenHash: string,
    exam: { centreId: string; examDate: string },
  ): Promise<void> {
    await this.candidatesRepository.update(candidateId, {
      refreshTokenHash,
      examCentreId: exam.centreId,
      examDate: exam.examDate,
    });
  }

  async invalidateSession(id: string): Promise<void> {
    await this.candidatesRepository.increment({ id }, 'tokenVersion', 1);
    await this.candidatesRepository.update(id, {
      refreshTokenHash: null,
      examCentreId: null,
      examDate: null,
    });
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.candidatesRepository.existsBy({
      id,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Candidate not found'));
    }
  }

  private async getOne(id: string): Promise<Candidate> {
    const candidate = await this.candidatesRepository.findOne({
      where: { id, companyId: this.companyId },
      relations: { groups: true, documents: true },
    });

    if (!candidate) {
      throw new NotFoundException(apiError('Candidate not found'));
    }

    return candidate;
  }

  private toGroups(groupIds: string[]): Group[] {
    return groupIds.map((id) => ({ id }) as Group);
  }

  private clearCandidateCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      candidatesCache.listKeysKey(this.companyId),
      ...(id ? [candidatesCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
