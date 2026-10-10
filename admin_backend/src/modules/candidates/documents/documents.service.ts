import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { CompanyContextService } from '../../../common/auth/company-context.service';
import {
  clearCached,
  getCache,
  getCacheList,
} from '../../../common/cache/redis-cache.util';
import { RedisService } from '../../../redis/redis.service';
import { PaginatedData } from '../../../common/types/paginated-response.type';
import {
  ApiResponse,
  apiError,
  apiSuccess,
  apiSuccessMessage,
} from '../../../common/utils/api-response.util';
import { paginateRepository } from '../../../common/utils/pagination.util';
import { softDeleteIfExists } from '../../../common/utils/soft-delete.util';
import { Candidate } from '../entities/candidate.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { candidateDocumentsCache } from './documents.cache';
import { CandidateDocument } from './entities/document.entity';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(CandidateDocument)
    private readonly documentsRepository: Repository<CandidateDocument>,
    @InjectRepository(Candidate)
    private readonly candidatesRepository: Repository<Candidate>,
    private readonly companyContext: CompanyContextService,
    private readonly redis: RedisService,
  ) {}

  async create(
    candidateId: string,
    createDocumentDto: CreateDocumentDto,
  ): Promise<ApiResponse<CandidateDocument>> {
    await this.assertCandidateExists(candidateId);

    const document = await this.documentsRepository.save(
      this.documentsRepository.create({
        companyId: this.companyId,
        candidateId,
        ...createDocumentDto,
      }),
    );

    await this.clearDocumentCache(candidateId);
    return apiSuccess('Candidate document created successfully', document);
  }

  async findAll(
    candidateId: string,
    query: QueryDocumentDto,
  ): Promise<ApiResponse<PaginatedData<CandidateDocument>>> {
    return getCacheList(
      this.redis,
      candidateDocumentsCache.listKeysKey(this.companyId, candidateId),
      candidateDocumentsCache.ttlSeconds,
      candidateDocumentsCache.listKey(this.companyId, candidateId, query),
      async () => {
        await this.assertCandidateExists(candidateId);

        const where: FindOptionsWhere<CandidateDocument> = {
          companyId: this.companyId,
          candidateId,
        };

        if (query.documentType) {
          where.documentType = query.documentType;
        }

        if (query.isActive !== undefined) {
          where.isActive = query.isActive;
        }

        const data = await paginateRepository(this.documentsRepository, query, {
          where,
          order: { updatedAt: 'DESC' },
        });

        return apiSuccess('Candidate documents fetched successfully', data);
      },
    );
  }

  async findOne(
    candidateId: string,
    id: string,
  ): Promise<ApiResponse<CandidateDocument>> {
    return getCache(
      this.redis,
      candidateDocumentsCache.itemKey(this.companyId, candidateId, id),
      candidateDocumentsCache.ttlSeconds,
      async () =>
        apiSuccess(
          'Candidate document fetched successfully',
          await this.getOne(candidateId, id),
        ),
    );
  }

  async update(
    candidateId: string,
    id: string,
    updateDocumentDto: UpdateDocumentDto,
  ): Promise<ApiResponse<CandidateDocument>> {
    const document = await this.getOne(candidateId, id);
    const saved = await this.documentsRepository.save(
      this.documentsRepository.merge(document, updateDocumentDto),
    );

    await this.clearDocumentCache(candidateId, id);
    return apiSuccess('Candidate document updated successfully', saved);
  }

  async remove(candidateId: string, id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.documentsRepository,
      { id, candidateId, companyId: this.companyId },
      'Candidate document not found',
    );

    await this.clearDocumentCache(candidateId, id);
    return apiSuccessMessage('Candidate document deleted successfully');
  }

  private async assertCandidateExists(candidateId: string): Promise<void> {
    const exists = await this.candidatesRepository.existsBy({
      id: candidateId,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Candidate not found'));
    }
  }

  private async getOne(
    candidateId: string,
    id: string,
  ): Promise<CandidateDocument> {
    const document = await this.documentsRepository.findOne({
      where: { id, candidateId, companyId: this.companyId },
    });

    if (!document) {
      throw new NotFoundException(apiError('Candidate document not found'));
    }

    return document;
  }

  private clearDocumentCache(candidateId: string, id?: string): Promise<void> {
    return clearCached(
      this.redis,
      candidateDocumentsCache.listKeysKey(this.companyId, candidateId),
      ...(id
        ? [candidateDocumentsCache.itemKey(this.companyId, candidateId, id)]
        : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
