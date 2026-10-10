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
import { candidateExamCache } from '../../candidates/candidate-exam.cache';
import { LanguagesService } from '../../languages/languages.service';
import { Test } from '../../tests/entities/test.entity';
import { Instruction } from '../entities/instruction.entity';
import { CreateInstructionLanguageDto } from './dto/create-instruction-language.dto';
import { QueryInstructionLanguageDto } from './dto/query-instruction-language.dto';
import { UpdateInstructionLanguageDto } from './dto/update-instruction-language.dto';
import { instructionLanguagesCache } from './instruction-languages.cache';
import { InstructionLanguage } from './entities/instruction-language.entity';

@Injectable()
export class InstructionLanguagesService {
  constructor(
    @InjectRepository(InstructionLanguage)
    private readonly instructionLanguagesRepository: Repository<InstructionLanguage>,
    @InjectRepository(Instruction)
    private readonly instructionsRepository: Repository<Instruction>,
    @InjectRepository(Test)
    private readonly testsRepository: Repository<Test>,
    private readonly companyContext: CompanyContextService,
    private readonly languagesService: LanguagesService,
    private readonly redis: RedisService,
  ) {}

  async create(
    instructionId: string,
    createDto: CreateInstructionLanguageDto,
  ): Promise<ApiResponse<InstructionLanguage>> {
    await this.assertInstructionExists(instructionId);
    await this.languagesService.assertExists(createDto.languageId);

    const instructionLanguage = await this.instructionLanguagesRepository.save(
      this.instructionLanguagesRepository.create({
        companyId: this.companyId,
        instructionId,
        ...createDto,
      }),
    );

    await this.clearInstructionLanguageCache(instructionId);
    return apiSuccess(
      'Instruction language created successfully',
      instructionLanguage,
    );
  }

  async findAll(
    instructionId: string,
    query: QueryInstructionLanguageDto,
  ): Promise<ApiResponse<PaginatedData<InstructionLanguage>>> {
    return getCacheList(
      this.redis,
      instructionLanguagesCache.listKeysKey(this.companyId, instructionId),
      instructionLanguagesCache.ttlSeconds,
      instructionLanguagesCache.listKey(this.companyId, instructionId, query),
      async () => {
        await this.assertInstructionExists(instructionId);

        const where: FindOptionsWhere<InstructionLanguage> = {
          companyId: this.companyId,
          instructionId,
        };

        if (query.languageId) {
          where.languageId = query.languageId;
        }

        if (query.isActive !== undefined) {
          where.isActive = query.isActive;
        }

        const data = await paginateRepository(
          this.instructionLanguagesRepository,
          query,
          {
            where,
            relations: { language: true },
            order: { updatedAt: 'DESC' },
          },
        );

        return apiSuccess('Instruction languages fetched successfully', data);
      },
    );
  }

  async findOne(
    instructionId: string,
    id: string,
  ): Promise<ApiResponse<InstructionLanguage>> {
    return getCache(
      this.redis,
      instructionLanguagesCache.itemKey(this.companyId, instructionId, id),
      instructionLanguagesCache.ttlSeconds,
      async () =>
        apiSuccess(
          'Instruction language fetched successfully',
          await this.getOne(instructionId, id),
        ),
    );
  }

  async update(
    instructionId: string,
    id: string,
    updateDto: UpdateInstructionLanguageDto,
  ): Promise<ApiResponse<InstructionLanguage>> {
    const instructionLanguage = await this.getOne(instructionId, id);

    if (updateDto.languageId) {
      await this.languagesService.assertExists(updateDto.languageId);
    }

    const saved = await this.instructionLanguagesRepository.save(
      this.instructionLanguagesRepository.merge(instructionLanguage, updateDto),
    );

    await this.clearInstructionLanguageCache(instructionId, id);
    return apiSuccess('Instruction language updated successfully', saved);
  }

  async remove(instructionId: string, id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.instructionLanguagesRepository,
      { id, instructionId, companyId: this.companyId },
      'Instruction language not found',
    );

    await this.clearInstructionLanguageCache(instructionId, id);
    return apiSuccessMessage('Instruction language deleted successfully');
  }

  private async assertInstructionExists(instructionId: string): Promise<void> {
    const exists = await this.instructionsRepository.existsBy({
      id: instructionId,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Instruction not found'));
    }
  }

  private async getOne(
    instructionId: string,
    id: string,
  ): Promise<InstructionLanguage> {
    const instructionLanguage =
      await this.instructionLanguagesRepository.findOne({
        where: { id, instructionId, companyId: this.companyId },
        relations: { language: true },
      });

    if (!instructionLanguage) {
      throw new NotFoundException(apiError('Instruction language not found'));
    }

    return instructionLanguage;
  }

  private async clearInstructionLanguageCache(
    instructionId: string,
    id?: string,
  ): Promise<void> {
    const tests = await this.testsRepository.find({
      where: { companyId: this.companyId, primaryInstructionId: instructionId },
      select: { id: true },
    });

    await clearCached(
      this.redis,
      instructionLanguagesCache.listKeysKey(this.companyId, instructionId),
      ...(id
        ? [instructionLanguagesCache.itemKey(this.companyId, instructionId, id)]
        : []),
      ...tests.map((test) =>
        candidateExamCache.detailsKey(this.companyId, test.id),
      ),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
