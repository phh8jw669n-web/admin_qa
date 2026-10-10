import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Not, Repository } from 'typeorm';
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
  isEndDateOnOrAfterStartDate,
  isEndTimeAfterStartTime,
} from '../../common/utils/time.util';
import { candidateExamCache } from '../candidates/candidate-exam.cache';
import { CategoriesService } from '../categories/categories.service';
import { InstructionsService } from '../instructions/instructions.service';
import { Question } from '../questions/entities/question.entity';
import { QuestionType } from '../questions/enums/question.enum';
import { TemplatesService } from '../templates/templates.service';
import { CreateTestDto } from './dto/create-test.dto';
import { QueryTestDto } from './dto/query-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { Test } from './entities/test.entity';
import { testsCache } from './tests.cache';
import { TestQuestionStats } from './types/test-question-stats.type';

@Injectable()
export class TestsService {
  constructor(
    @InjectRepository(Test)
    private readonly testsRepository: Repository<Test>,
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    private readonly companyContext: CompanyContextService,
    private readonly categoriesService: CategoriesService,
    private readonly instructionsService: InstructionsService,
    private readonly templatesService: TemplatesService,
    private readonly redis: RedisService,
  ) {}

  async create(createTestDto: CreateTestDto): Promise<ApiResponse<Test>> {
    await this.assertRelations(
      createTestDto.categoryId,
      createTestDto.primaryInstructionId,
      createTestDto.templateId,
    );
    this.assertValidTimeRange(createTestDto.startTime, createTestDto.endTime);
    this.assertValidDateRange(createTestDto.startDate, createTestDto.endDate);
    this.assertValidDurations(
      createTestDto.durationMinutes,
      createTestDto.handicappedDurationMinutes,
    );
    this.assertValidMarks(createTestDto.totalMarks, createTestDto.passingMarks);

    const test = await this.testsRepository.save(
      this.testsRepository.create({
        ...createTestDto,
        companyId: this.companyId,
      }),
    );

    await this.clearTestCache();
    return apiSuccess('Test created successfully', await this.getOne(test.id));
  }

  async findAll(
    query: QueryTestDto,
  ): Promise<ApiResponse<PaginatedData<Test>>> {
    const load = async () => {
      const where: FindOptionsWhere<Test> = {
        companyId: this.companyId,
      };

      if (query.name) {
        where.name = ilikePrefix(query.name);
      }

      if (query.testCode) {
        where.testCode = query.testCode;
      }

      if (query.categoryId) {
        where.categoryId = query.categoryId;
      }

      if (query.templateId) {
        where.templateId = query.templateId;
      }

      if (query.isDraft !== undefined) {
        where.isDraft = query.isDraft;
      }

      if (query.isPublished !== undefined) {
        where.isPublished = query.isPublished;
      }

      if (query.isActive !== undefined) {
        where.isActive = query.isActive;
      }

      const data = await paginateRepository(this.testsRepository, query, {
        where,
        relations: {
          category: true,
          primaryInstruction: true,
          template: true,
        },
        order: { createdAt: 'DESC' },
      });

      return apiSuccess('Tests fetched successfully', data);
    };

    if (query.name) {
      return load();
    }

    return getCacheList(
      this.redis,
      testsCache.listKeysKey(this.companyId),
      testsCache.ttlSeconds,
      testsCache.listKey(this.companyId, query),
      load,
    );
  }

  async findOne(id: string): Promise<ApiResponse<Test>> {
    return getCache(
      this.redis,
      testsCache.itemKey(this.companyId, id),
      testsCache.ttlSeconds,
      async () =>
        apiSuccess('Test fetched successfully', await this.getOne(id)),
    );
  }

  async getQuestionStats(id: string): Promise<ApiResponse<TestQuestionStats>> {
    return getCache(
      this.redis,
      testsCache.statsKey(this.companyId, id),
      testsCache.ttlSeconds,
      () => this.loadQuestionStats(id),
    );
  }

  private async loadQuestionStats(
    id: string,
  ): Promise<ApiResponse<TestQuestionStats>> {
    const test = await this.getOne(id);
    const actualQuestions = await this.questionsRepository.count({
      where: {
        testId: test.id,
        companyId: this.companyId,
        questionType: Not(QuestionType.COMPREHENSION),
      },
    });
    const marksRow = await this.questionsRepository.query<
      { actual_marks: string }[]
    >(
      `
      SELECT COALESCE(SUM(picked.right_marks), 0) AS actual_marks
      FROM (
        SELECT DISTINCT ON (content.question_id) content.right_marks
        FROM question_content content
        INNER JOIN questions question ON question.id = content.question_id
        WHERE question.test_id = $1
          AND question.company_id = $2
          AND question.deleted_at IS NULL
          AND question.question_type <> 'comprehension'
          AND content.deleted_at IS NULL
        ORDER BY content.question_id, content.created_at ASC
      ) picked
      `,
      [test.id, this.companyId],
    );

    return apiSuccess('Test question stats fetched successfully', {
      totalQuestions: test.totalQuestions,
      totalMarks: test.totalMarks,
      actualQuestions,
      actualMarks: Number(marksRow[0]?.actual_marks ?? 0),
    });
  }

  async assertExists(id: string): Promise<void> {
    const exists = await this.testsRepository.existsBy({
      id,
      companyId: this.companyId,
    });

    if (!exists) {
      throw new NotFoundException(apiError('Test not found'));
    }
  }

  async assertCanAddQuestion(
    testId: string,
    manager: EntityManager,
    count = 1,
  ): Promise<void> {
    const test = await manager.getRepository(Test).findOne({
      where: { id: testId, companyId: this.companyId },
      lock: { mode: 'pessimistic_write' },
    });

    if (!test) {
      throw new NotFoundException(apiError('Test not found'));
    }

    if (count <= 0) {
      return;
    }

    const actualQuestions = await manager.getRepository(Question).count({
      where: {
        testId: test.id,
        companyId: this.companyId,
        questionType: Not(QuestionType.COMPREHENSION),
      },
    });

    if (actualQuestions + count > test.totalQuestions) {
      throw new BadRequestException(
        apiError('This test already has the maximum number of questions'),
      );
    }
  }

  async update(
    id: string,
    updateTestDto: UpdateTestDto,
  ): Promise<ApiResponse<Test>> {
    const test = await this.getOne(id);

    await this.assertRelations(
      updateTestDto.categoryId ?? test.categoryId,
      updateTestDto.primaryInstructionId ?? test.primaryInstructionId,
      updateTestDto.templateId ?? test.templateId,
    );
    this.assertValidTimeRange(
      updateTestDto.startTime !== undefined
        ? updateTestDto.startTime
        : test.startTime,
      updateTestDto.endTime !== undefined
        ? updateTestDto.endTime
        : test.endTime,
    );
    this.assertValidDateRange(
      updateTestDto.startDate !== undefined
        ? updateTestDto.startDate
        : test.startDate,
      updateTestDto.endDate !== undefined
        ? updateTestDto.endDate
        : test.endDate,
    );
    this.assertValidDurations(
      updateTestDto.durationMinutes ?? test.durationMinutes,
      updateTestDto.handicappedDurationMinutes ??
        test.handicappedDurationMinutes,
    );
    this.assertValidMarks(
      updateTestDto.totalMarks ?? test.totalMarks,
      updateTestDto.passingMarks ?? test.passingMarks,
    );

    const saved = await this.testsRepository.save(
      this.testsRepository.merge(test, updateTestDto),
    );

    await this.clearTestCache(id);
    return apiSuccess('Test updated successfully', await this.getOne(saved.id));
  }

  async remove(id: string): Promise<ApiResponse> {
    await softDeleteIfExists(
      this.testsRepository,
      { id, companyId: this.companyId },
      'Test not found',
    );

    await this.clearTestCache(id);
    return apiSuccessMessage('Test deleted successfully');
  }

  private assertValidDateRange(
    startDate: string | null | undefined,
    endDate: string | null | undefined,
  ): void {
    if (!startDate || !endDate) {
      return;
    }

    if (!isEndDateOnOrAfterStartDate(startDate, endDate)) {
      throw new BadRequestException(
        apiError('End date must be on or after start date'),
      );
    }
  }

  private assertValidTimeRange(
    startTime: string | null | undefined,
    endTime: string | null | undefined,
  ): void {
    if (!startTime || !endTime) {
      return;
    }

    if (!isEndTimeAfterStartTime(startTime, endTime)) {
      throw new BadRequestException(
        apiError('End time must be after start time'),
      );
    }
  }

  private assertValidDurations(
    durationMinutes: number,
    handicappedDurationMinutes: number,
  ): void {
    if (handicappedDurationMinutes < durationMinutes) {
      throw new BadRequestException(
        apiError(
          'Handicapped duration must be greater than or equal to normal duration',
        ),
      );
    }
  }

  private assertValidMarks(totalMarks: number, passingMarks: number): void {
    if (passingMarks > totalMarks) {
      throw new BadRequestException(
        apiError('Passing marks cannot be greater than total marks'),
      );
    }
  }

  private async assertRelations(
    categoryId: string,
    instructionId: string,
    templateId: string,
  ): Promise<void> {
    await this.categoriesService.assertExists(categoryId);
    await this.instructionsService.assertExists(instructionId);
    await this.templatesService.assertExists(templateId);
  }

  private async getOne(id: string): Promise<Test> {
    const test = await this.testsRepository.findOne({
      where: { id, companyId: this.companyId },
      relations: {
        category: true,
        primaryInstruction: true,
        template: true,
      },
    });

    if (!test) {
      throw new NotFoundException(apiError('Test not found'));
    }

    return test;
  }

  private clearTestCache(id?: string): Promise<void> {
    return clearCached(
      this.redis,
      testsCache.listKeysKey(this.companyId),
      ...(id
        ? [
            testsCache.itemKey(this.companyId, id),
            testsCache.statsKey(this.companyId, id),
            candidateExamCache.detailsKey(this.companyId, id),
          ]
        : []),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
