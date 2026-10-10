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
import { ilikePrefix } from '../../common/utils/ilike.util';
import { paginateRepository } from '../../common/utils/pagination.util';
import { softDeleteIfExists } from '../../common/utils/soft-delete.util';
import { CreateInstructionDto } from './dto/create-instruction.dto';
import { QueryInstructionDto } from './dto/query-instruction.dto';
import { UpdateInstructionDto } from './dto/update-instruction.dto';
import { Instruction } from './entities/instruction.entity';
import { instructionLanguagesCache } from './instruction-languages/instruction-languages.cache';
import { instructionsCache } from './instructions.cache';

@Injectable()
export class InstructionsService {
  constructor(
    @InjectRepository(Instruction)
    private readonly instructionsRepository: Repository<Instruction>,
    private readonly companyContext: CompanyContextService,
    private readonly redis: RedisService,
  ) {}

  async create(
    createInstructionDto: CreateInstructionDto,
  ): Promise<ApiResponse<Instruction>> {
    const instruction = await this.instructionsRepository.save(
      this.instructionsRepository.create({
        companyId: this.companyId,
        ...createInstructionDto,
      }),
    );

    await this.clearInstructionCache();
    return apiSuccess('Instruction created successfully', instruction);
  }

  async findAll(
    query: QueryInstructionDto,
  ): Promise<ApiResponse<PaginatedData<Instruction>>> {
    const load = async () => {
      const where: FindOptionsWhere<Instruction> = {
        companyId: this.companyId,
      };

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.ranking !== undefined) {
        where.ranking = query.ranking;
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(
        this.instructionsRepository,
        query,
        {
          where,
          order: { ranking: 'ASC', updatedAt: 'DESC' },
        },
      );

      return apiSuccess('Instructions fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      instructionsCache.listKeysKey(this.companyId),
      instructionsCache.ttlSeconds,
      instructionsCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Instruction>> {
    return getCache(
      this.redis,
      instructionsCache.itemKey(this.companyId, id),
      instructionsCache.ttlSeconds,
      async () =>
        apiSuccess('Instruction fetched successfully', await this.getOne(id)),
    );
  }

  async update(
    id: string,
    updateInstructionDto: UpdateInstructionDto,
  ): Promise<ApiResponse<Instruction>> {
    const instruction = await this.getOne(id);
    const saved = await this.instructionsRepository.save(
      this.instructionsRepository.merge(instruction, updateInstructionDto),
    );

    await this.clearInstructionCache(id);
    return apiSuccess('Instruction updated successfully', saved);
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.instructionsRepository,
      { id, companyId: this.companyId },
      'Instruction not found',
    );

    await this.clearInstructionCache(id);
    await clearCached(
      this.redis,
      instructionLanguagesCache.listKeysKey(this.companyId, id),
    );
    return apiSuccessMessage('Instruction deleted successfully');
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.instructionsRepository.existsBy({
      id,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Instruction not found'));
    }
  }

  private async getOne(id: string): Promise<Instruction> {
    const instruction = await this.instructionsRepository.findOne({
      where: { id, companyId: this.companyId },
    });

    if (!instruction) {
      throw new NotFoundException(apiError('Instruction not found'));
    }

    return instruction;
  }

  private clearInstructionCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      instructionsCache.listKeysKey(this.companyId),
      ...(id ? [instructionsCache.itemKey(this.companyId, id)] : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
