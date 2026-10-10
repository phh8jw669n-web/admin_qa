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
import { Candidate } from '../candidates/entities/candidate.entity';
import { CentresService } from '../centres/centres.service';
import { candidateCentreMappingsCache } from './candidate-centre-mappings.cache';
import { CreateCandidateCentreMappingDto } from './dto/create-candidate-centre-mapping.dto';
import { QueryCandidateCentreMappingDto } from './dto/query-candidate-centre-mapping.dto';
import { UpdateCandidateCentreMappingDto } from './dto/update-candidate-centre-mapping.dto';
import { CandidateCentreMapping } from './entities/candidate-centre-mapping.entity';

@Injectable()
export class CandidateCentreMappingsService {
  constructor(
    @InjectRepository(CandidateCentreMapping)
    private readonly mappingsRepository: Repository<CandidateCentreMapping>,
    @InjectRepository(Candidate)
    private readonly candidatesRepository: Repository<Candidate>,
    private readonly companyContext: CompanyContextService,
    private readonly centresService: CentresService,
    private readonly redis: RedisService,
  ) {}

  async create(
    dto: CreateCandidateCentreMappingDto,
  ): Promise<ApiResponse<CandidateCentreMapping>> {
    await this.assertRelations(dto.candidateId, dto.centreId);

    const mapping = await this.mappingsRepository.save(
      this.mappingsRepository.create({
        companyId: this.companyId,
        ...dto,
      }),
    );

    await this.clearCache();
    return apiSuccess(
      'Candidate centre mapping created successfully',
      await this.getOne(mapping.id),
    );
  }

  async findAll(
    query: QueryCandidateCentreMappingDto,
  ): Promise<ApiResponse<PaginatedData<CandidateCentreMapping>>> {
    return getCacheList(
      this.redis,
      candidateCentreMappingsCache.listKeysKey(this.companyId),
      candidateCentreMappingsCache.ttlSeconds,
      candidateCentreMappingsCache.listKey(this.companyId, query),
      async () => {
        const where: FindOptionsWhere<CandidateCentreMapping> = {
          companyId: this.companyId,
        };

        if (query.candidateId) {
          where.candidateId = query.candidateId;
        }

        if (query.centreId) {
          where.centreId = query.centreId;
        }

        if (query.examDate) {
          where.examDate = query.examDate;
        }

        const data = await paginateRepository(this.mappingsRepository, query, {
          where,
          relations: { candidate: true, centre: true },
          order: { examDate: 'DESC', updatedAt: 'DESC' },
        });

        return apiSuccess(
          'Candidate centre mappings fetched successfully',
          data,
        );
      },
    );
  }

  async findOne(id: string): Promise<ApiResponse<CandidateCentreMapping>> {
    return getCache(
      this.redis,
      candidateCentreMappingsCache.itemKey(this.companyId, id),
      candidateCentreMappingsCache.ttlSeconds,
      async () =>
        apiSuccess(
          'Candidate centre mapping fetched successfully',
          await this.getOne(id),
        ),
    );
  }

  async update(
    id: string,
    dto: UpdateCandidateCentreMappingDto,
  ): Promise<ApiResponse<CandidateCentreMapping>> {
    const mapping = await this.getOne(id);
    const candidateId = dto.candidateId ?? mapping.candidateId;
    const centreId = dto.centreId ?? mapping.centreId;

    if (
      candidateId !== mapping.candidateId ||
      centreId !== mapping.centreId
    ) {
      await this.assertRelations(candidateId, centreId);
    }

    const saved = await this.mappingsRepository.save(
      this.mappingsRepository.merge(mapping, dto),
    );

    await this.clearCache(id);
    return apiSuccess(
      'Candidate centre mapping updated successfully',
      saved,
    );
  }

  async remove(id: string): Promise<ApiResponse> {
    await this.getOne(id);
    const result = await this.mappingsRepository.update(
      { id, companyId: this.companyId },
      { deletedAt: new Date() },
    );

    if (!result.affected) {
      throw new NotFoundException(
        apiError('Candidate centre mapping not found'),
      );
    }

    await this.clearCache(id);
    return apiSuccessMessage('Candidate centre mapping deleted successfully');
  }

  isMapped(input: {
    companyId: string;
    candidateId: string;
    centreId: string;
    examDate: string;
  }): Promise<boolean> {
    return this.mappingsRepository.existsBy({
      companyId: input.companyId,
      candidateId: input.candidateId,
      centreId: input.centreId,
      examDate: input.examDate,
    });
  }

  private async assertRelations(
    candidateId: string,
    centreId: string,
  ): Promise<void> {
    const candidateExists = await this.candidatesRepository.existsBy({
      id: candidateId,
      companyId: this.companyId,
    });

    if (!candidateExists) {
      throw new NotFoundException(apiError('Candidate not found'));
    }

    await this.centresService.assertExistsInCompany(centreId, this.companyId);
  }

  private async getOne(id: string): Promise<CandidateCentreMapping> {
    const mapping = await this.mappingsRepository.findOne({
      where: { id, companyId: this.companyId },
      relations: { candidate: true, centre: true },
    });

    if (!mapping) {
      throw new NotFoundException(
        apiError('Candidate centre mapping not found'),
      );
    }

    return mapping;
  }

  private clearCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      candidateCentreMappingsCache.listKeysKey(this.companyId),
      ...(id
        ? [candidateCentreMappingsCache.itemKey(this.companyId, id)]
        : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
