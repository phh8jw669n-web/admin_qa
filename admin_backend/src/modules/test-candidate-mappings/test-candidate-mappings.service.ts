import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { paginateRepository } from '../../common/utils/pagination.util';
import { CandidatesService } from '../candidates/candidates.service';
import { GroupsService } from '../groups/groups.service';
import { TestsService } from '../tests/tests.service';
import { AssignTestEmailDto } from './dto/assign-test-email.dto';
import { AssignTestGroupsDto } from './dto/assign-test-groups.dto';
import { CreateTestCandidateMappingDto } from './dto/create-test-candidate-mapping.dto';
import { QueryTestCandidateMappingDto } from './dto/query-test-candidate-mapping.dto';
import { UpdateTestCandidateMappingDto } from './dto/update-test-candidate-mapping.dto';
import { testCandidateMappingsCache } from './test-candidate-mappings.cache';
import { TestCandidateMapping } from './entities/test-candidate-mapping.entity';

@Injectable()
export class TestCandidateMappingsService {
  constructor(
    @InjectRepository(TestCandidateMapping)
    private readonly mappingsRepository: Repository<TestCandidateMapping>,
    private readonly companyContext: CompanyContextService,
    private readonly groupsService: GroupsService,
    private readonly candidatesService: CandidatesService,
    private readonly testsService: TestsService,
    private readonly redis: RedisService,
  ) {}

  async create(
    createDto: CreateTestCandidateMappingDto,
  ): Promise<ApiResponse<TestCandidateMapping>> {
    await this.assertRelations(
      createDto.groupId,
      createDto.candidateId,
      createDto.testId,
    );

    const mapping = await this.mappingsRepository.save(
      this.mappingsRepository.create({
        companyId: this.companyId,
        ...createDto,
      }),
    );

    await this.clearTestCandidateCache();
    return apiSuccess(
      'Test candidate mapping created successfully',
      await this.getOne(mapping.id),
    );
  }

  async assignGroups(dto: AssignTestGroupsDto): Promise<
    ApiResponse<{
      testId: string;
      assigned: number;
      alreadyAssigned: number;
    }>
  > {
    const groupIds = [...new Set(dto.groupIds)];
    await Promise.all([
      this.testsService.assertExists(dto.testId),
      this.groupsService.assertAllExist(groupIds),
    ]);

    const candidates = await this.candidatesService.findByGroupIds(groupIds);
    const existingIds = await this.findAssignedCandidateIds(
      dto.testId,
      candidates.map((candidate) => candidate.id),
    );

    const mappings = candidates.flatMap((candidate) => {
      if (existingIds.has(candidate.id)) {
        return [];
      }

      const groupId = groupIds.find((id) => candidate.groupIds.includes(id));

      if (!groupId) {
        return [];
      }

      return [
        this.mappingsRepository.create({
          companyId: this.companyId,
          groupId,
          candidateId: candidate.id,
          testId: dto.testId,
        }),
      ];
    });

    if (mappings.length) {
      await this.mappingsRepository.save(mappings);
      await this.clearTestCandidateCache();
    }

    return apiSuccess('Test assigned to groups successfully', {
      testId: dto.testId,
      assigned: mappings.length,
      alreadyAssigned: existingIds.size,
    });
  }

  async assignEmail(dto: AssignTestEmailDto): Promise<
    ApiResponse<{
      testId: string;
      assigned: number;
      alreadyAssigned: number;
    }>
  > {
    await this.testsService.assertExists(dto.testId);

    const candidates = await this.candidatesService.findByEmails(dto.email);
    const foundEmails = new Set(
      candidates.map((candidate) => candidate.email.toLowerCase()),
    );
    const missingEmails = dto.email.filter((email) => !foundEmails.has(email));

    if (missingEmails.length) {
      throw new NotFoundException(
        apiError(`Candidate not found: ${missingEmails.join(', ')}`),
      );
    }

    const groupIds = [
      ...new Set(
        candidates.map((candidate) => dto.groupId ?? candidate.groupIds[0]),
      ),
    ].filter((groupId): groupId is string => Boolean(groupId));

    for (const candidate of candidates) {
      const groupId = dto.groupId ?? candidate.groupIds[0];

      if (!groupId) {
        throw new BadRequestException(
          apiError(`Candidate is not in a group: ${candidate.email}`),
        );
      }

      if (!candidate.groupIds.includes(groupId)) {
        throw new BadRequestException(
          apiError(
            `Candidate is not a member of the selected group: ${candidate.email}`,
          ),
        );
      }
    }

    if (dto.groupId) {
      await this.groupsService.assertAllExist([dto.groupId]);
    } else if (groupIds.length) {
      await this.groupsService.assertAllExist(groupIds);
    }

    const existingIds = await this.findAssignedCandidateIds(
      dto.testId,
      candidates.map((candidate) => candidate.id),
    );

    const mappings = candidates.flatMap((candidate) => {
      if (existingIds.has(candidate.id)) {
        return [];
      }

      const groupId = dto.groupId ?? candidate.groupIds[0];

      return [
        this.mappingsRepository.create({
          companyId: this.companyId,
          groupId,
          candidateId: candidate.id,
          testId: dto.testId,
        }),
      ];
    });

    if (mappings.length) {
      await this.mappingsRepository.save(mappings);
      await this.clearTestCandidateCache();
    }

    return apiSuccess('Test assigned to candidates successfully', {
      testId: dto.testId,
      assigned: mappings.length,
      alreadyAssigned: existingIds.size,
    });
  }

  async findAll(
    query: QueryTestCandidateMappingDto,
  ): Promise<ApiResponse<PaginatedData<TestCandidateMapping>>> {
    return getCacheList(
      this.redis,
      testCandidateMappingsCache.listKeysKey(this.companyId),
      testCandidateMappingsCache.ttlSeconds,
      testCandidateMappingsCache.listKey(this.companyId, query),
      async () => {
        const where: FindOptionsWhere<TestCandidateMapping> = {
          companyId: this.companyId,
        };

        if (query.groupId) {
          where.groupId = query.groupId;
        }

        if (query.candidateId) {
          where.candidateId = query.candidateId;
        }

        if (query.testId) {
          where.testId = query.testId;
        }

        if (query.attemptNo !== undefined) {
          where.attemptNo = query.attemptNo;
        }

        if (query.status) {
          where.status = query.status;
        }

        const data = await paginateRepository(this.mappingsRepository, query, {
          where,
          relations: { group: true, candidate: true, test: true },
          order: { updatedAt: 'DESC' },
        });

        return apiSuccess('Test candidate mappings fetched successfully', data);
      },
    );
  }

  async findOne(id: string): Promise<ApiResponse<TestCandidateMapping>> {
    return getCache(
      this.redis,
      testCandidateMappingsCache.itemKey(this.companyId, id),
      testCandidateMappingsCache.ttlSeconds,
      async () =>
        apiSuccess(
          'Test candidate mapping fetched successfully',
          await this.getOne(id),
        ),
    );
  }

  async update(
    id: string,
    updateDto: UpdateTestCandidateMappingDto,
  ): Promise<ApiResponse<TestCandidateMapping>> {
    const mapping = await this.getOne(id);
    const relationsChanged =
      (updateDto.groupId !== undefined &&
        updateDto.groupId !== mapping.groupId) ||
      (updateDto.candidateId !== undefined &&
        updateDto.candidateId !== mapping.candidateId) ||
      (updateDto.testId !== undefined && updateDto.testId !== mapping.testId);

    if (relationsChanged) {
      await this.assertRelations(
        updateDto.groupId ?? mapping.groupId,
        updateDto.candidateId ?? mapping.candidateId,
        updateDto.testId ?? mapping.testId,
      );
    }

    const saved = await this.mappingsRepository.save(
      this.mappingsRepository.merge(mapping, updateDto),
    );

    await this.clearTestCandidateCache(id);
    return apiSuccess(
      'Test candidate mapping updated successfully',
      relationsChanged ? await this.getOne(id) : saved,
    );
  }

  async remove(id: string): Promise<ApiResponse> {
    await this.getOne(id);
    const result = await this.mappingsRepository.update(
      { id, companyId: this.companyId },
      { deletedAt: new Date() },
    );

    if (!result.affected) {
      throw new NotFoundException(apiError('Test candidate mapping not found'));
    }

    await this.clearTestCandidateCache(id);
    return apiSuccessMessage('Test candidate mapping deleted successfully');
  }

  private async findAssignedCandidateIds(
    testId: string,
    candidateIds: string[],
  ): Promise<Set<string>> {
    if (!candidateIds.length) {
      return new Set();
    }

    const existing = await this.mappingsRepository.find({
      select: { candidateId: true },
      where: {
        companyId: this.companyId,
        testId,
        attemptNo: 1,
        candidateId: In(candidateIds),
      },
    });

    return new Set(existing.map((mapping) => mapping.candidateId));
  }

  private async assertRelations(
    groupId: string,
    candidateId: string,
    testId: string,
  ): Promise<void> {
    await Promise.all([
      this.groupsService.assertAllExist([groupId]),
      this.candidatesService.assertExists(candidateId),
      this.testsService.assertExists(testId),
    ]);
  }

  private async getOne(id: string): Promise<TestCandidateMapping> {
    const mapping = await this.mappingsRepository.findOne({
      where: { id, companyId: this.companyId },
      relations: { group: true, candidate: true, test: true },
    });

    if (!mapping) {
      throw new NotFoundException(apiError('Test candidate mapping not found'));
    }

    return mapping;
  }

  private clearTestCandidateCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      testCandidateMappingsCache.listKeysKey(this.companyId),
      ...(id ? [testCandidateMappingsCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
