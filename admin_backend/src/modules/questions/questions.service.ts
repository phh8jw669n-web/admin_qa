import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  IsNull,
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
import { paginateRepository } from '../../common/utils/pagination.util';
import { softDeleteIfExists } from '../../common/utils/soft-delete.util';
import { DifficultiesService } from '../difficulties/difficulties.service';
import { LanguagesService } from '../languages/languages.service';
import { SubjectsService } from '../subjects/subjects.service';
import { candidateExamCache } from '../candidates/candidate-exam.cache';
import { testsCache } from '../tests/tests.cache';
import { TestsService } from '../tests/tests.service';
import { TopicsService } from '../topics/topics.service';
import {
  ChildQuestionDto,
  CreateQuestionDto,
  QuestionContentItemDto,
} from './dto/create-question.dto';
import { QueryQuestionDto } from './dto/query-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionContent } from './entities/question-content.entity';
import { Question } from './entities/question.entity';
import { QuestionType } from './enums/question.enum';
import { questionsCache } from './questions.cache';

type QuestionNode = {
  question: Question;
  questionData: QuestionContent[];
};

type QuestionView = QuestionNode & {
  childQuestions: QuestionNode[];
};

@Injectable()
export class QuestionsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    @InjectRepository(QuestionContent)
    private readonly questionContentsRepository: Repository<QuestionContent>,
    private readonly companyContext: CompanyContextService,
    private readonly testsService: TestsService,
    private readonly subjectsService: SubjectsService,
    private readonly topicsService: TopicsService,
    private readonly languagesService: LanguagesService,
    private readonly difficultiesService: DifficultiesService,
    private readonly redis: RedisService,
  ) {}

  async create(
    createQuestionDto: CreateQuestionDto,
  ): Promise<ApiResponse<QuestionView>> {
    this.assertQuestionTypes(
      createQuestionDto.questionType,
      createQuestionDto.questionData,
    );
    this.assertUniqueLanguages(createQuestionDto.questionData);
    this.assertChildQuestions(
      createQuestionDto.questionType,
      createQuestionDto.childQuestions,
      true,
    );
    await this.assertPayloadRelations(createQuestionDto);

    const result = await this.dataSource.transaction(async (manager) => {
      const slots =
        createQuestionDto.questionType === QuestionType.COMPREHENSION
          ? (createQuestionDto.childQuestions?.length ?? 0)
          : 1;

      await this.testsService.assertCanAddQuestion(
        createQuestionDto.testId,
        manager,
        slots,
      );

      const question = await manager.save(
        Question,
        manager.create(Question, {
          companyId: this.companyId,
          testId: createQuestionDto.testId,
          subjectId: createQuestionDto.subjectId,
          topicId: createQuestionDto.topicId,
          questionType: createQuestionDto.questionType,
          isActive: createQuestionDto.isActive ?? true,
          parentQuestionId: null,
          sortOrder: 0,
        }),
      );

      await manager.save(
        QuestionContent,
        createQuestionDto.questionData.map((item) =>
          manager.create(
            QuestionContent,
            this.toContentFields(question.id, item),
          ),
        ),
      );

      if (createQuestionDto.childQuestions?.length) {
        await this.replaceChildQuestions(
          manager,
          question,
          createQuestionDto.childQuestions,
        );
      }

      return this.loadView(manager, question);
    });

    await this.clearQuestionCache(
      [
        result.question.id,
        ...result.childQuestions.map((child) => child.question.id),
      ],
      [createQuestionDto.testId],
    );
    return apiSuccess('Question created successfully', result);
  }

  async findAll(
    query: QueryQuestionDto,
  ): Promise<ApiResponse<PaginatedData<Question>>> {
    return getCacheList(
      this.redis,
      questionsCache.listKeysKey(this.companyId),
      questionsCache.ttlSeconds,
      questionsCache.listKey(this.companyId, query),
      async () => {
        const where: FindOptionsWhere<Question> = {
          companyId: this.companyId,
          parentQuestionId: IsNull(),
        };

        if (query.testId) {
          where.testId = query.testId;
        }

        if (query.subjectId) {
          where.subjectId = query.subjectId;
        }

        if (query.topicId) {
          where.topicId = query.topicId;
        }

        if (query.questionType) {
          where.questionType = query.questionType;
        }

        if (query.isActive !== undefined) {
          where.isActive = query.isActive;
        }

        const data = await paginateRepository(this.questionsRepository, query, {
          where,
          order: { createdAt: 'DESC' },
        });

        return apiSuccess('Questions fetched successfully', data);
      },
    );
  }

  async findOne(id: string): Promise<ApiResponse<QuestionView>> {
    return getCache(
      this.redis,
      questionsCache.itemKey(this.companyId, id),
      questionsCache.ttlSeconds,
      async () => {
        const question = await this.getOne(id);
        const view = await this.loadView(
          this.questionsRepository.manager,
          question,
        );

        return apiSuccess('Question fetched successfully', view);
      },
    );
  }

  async update(
    id: string,
    updateQuestionDto: UpdateQuestionDto,
  ): Promise<ApiResponse<QuestionView>> {
    const question = await this.getOne(id);
    const nextQuestionType =
      updateQuestionDto.questionType ?? question.questionType;

    if (question.parentQuestionId) {
      if (updateQuestionDto.childQuestions?.length) {
        throw new BadRequestException(
          apiError('A child question cannot contain child questions'),
        );
      }

      if (
        updateQuestionDto.testId !== undefined ||
        updateQuestionDto.subjectId !== undefined ||
        updateQuestionDto.topicId !== undefined
      ) {
        throw new BadRequestException(
          apiError(
            'A child question uses the comprehension test, subject, and topic',
          ),
        );
      }

      if (nextQuestionType === QuestionType.COMPREHENSION) {
        throw new BadRequestException(
          apiError('A child question cannot be a comprehension'),
        );
      }
    }

    if (updateQuestionDto.questionData) {
      this.assertQuestionTypes(
        nextQuestionType,
        updateQuestionDto.questionData,
      );
      this.assertUniqueLanguages(updateQuestionDto.questionData);
    } else if (
      updateQuestionDto.questionType &&
      updateQuestionDto.questionType !== question.questionType
    ) {
      const existingContents = await this.questionContentsRepository.find({
        where: { questionId: question.id, companyId: this.companyId },
      });
      this.assertQuestionTypes(
        updateQuestionDto.questionType,
        existingContents.map((item) => ({
          languageId: item.languageId,
          difficultyId: item.difficultyId,
          questionType: item.questionType!,
        })),
      );
    }

    this.assertChildQuestions(
      nextQuestionType,
      updateQuestionDto.childQuestions,
      false,
    );

    if (
      question.questionType === QuestionType.COMPREHENSION &&
      nextQuestionType !== QuestionType.COMPREHENSION &&
      updateQuestionDto.childQuestions === undefined
    ) {
      const childCount = await this.questionsRepository.count({
        where: { parentQuestionId: question.id, companyId: this.companyId },
      });

      if (childCount > 0) {
        throw new BadRequestException(
          apiError('Remove child questions before changing the question type'),
        );
      }
    }

    await this.assertPayloadRelations(updateQuestionDto);

    const removedChildIds: string[] = [];
    const result = await this.dataSource.transaction(async (manager) => {
      const existingChildCount = await manager.getRepository(Question).count({
        where: { parentQuestionId: question.id, companyId: this.companyId },
      });
      const nextChildCount =
        nextQuestionType === QuestionType.COMPREHENSION
          ? (updateQuestionDto.childQuestions?.length ?? existingChildCount)
          : 0;
      const currentSlots =
        question.questionType === QuestionType.COMPREHENSION
          ? existingChildCount
          : 1;
      const nextSlots =
        nextQuestionType === QuestionType.COMPREHENSION ? nextChildCount : 1;
      const testChanged = Boolean(
        updateQuestionDto.testId &&
        updateQuestionDto.testId !== question.testId,
      );

      if (testChanged) {
        await this.testsService.assertCanAddQuestion(
          updateQuestionDto.testId!,
          manager,
          nextSlots,
        );
      } else if (nextSlots > currentSlots) {
        await this.testsService.assertCanAddQuestion(
          question.testId,
          manager,
          nextSlots - currentSlots,
        );
      }

      const savedQuestion = await manager.save(
        Question,
        manager.merge(Question, question, {
          ...(updateQuestionDto.testId !== undefined && {
            testId: updateQuestionDto.testId,
          }),
          ...(updateQuestionDto.subjectId !== undefined && {
            subjectId: updateQuestionDto.subjectId,
          }),
          ...(updateQuestionDto.topicId !== undefined && {
            topicId: updateQuestionDto.topicId,
          }),
          ...(updateQuestionDto.questionType !== undefined && {
            questionType: updateQuestionDto.questionType,
          }),
          ...(updateQuestionDto.isActive !== undefined && {
            isActive: updateQuestionDto.isActive,
          }),
        }),
      );

      if (
        savedQuestion.questionType === QuestionType.COMPREHENSION &&
        (savedQuestion.testId !== question.testId ||
          savedQuestion.subjectId !== question.subjectId ||
          savedQuestion.topicId !== question.topicId)
      ) {
        await manager
          .createQueryBuilder()
          .update(Question)
          .set({
            testId: savedQuestion.testId,
            subjectId: savedQuestion.subjectId,
            topicId: savedQuestion.topicId,
          })
          .where('parent_question_id = :id', { id: savedQuestion.id })
          .andWhere('company_id = :companyId', { companyId: this.companyId })
          .andWhere('deleted_at IS NULL')
          .execute();
      }

      if (updateQuestionDto.questionData) {
        await this.replaceQuestionContent(
          manager,
          savedQuestion.id,
          updateQuestionDto.questionData,
        );
      }

      if (updateQuestionDto.childQuestions) {
        removedChildIds.push(
          ...(await this.replaceChildQuestions(
            manager,
            savedQuestion,
            updateQuestionDto.childQuestions,
          )),
        );
      }

      return this.loadView(manager, savedQuestion);
    });

    await this.clearQuestionCache(
      [
        id,
        question.parentQuestionId,
        ...removedChildIds,
        ...result.childQuestions.map((child) => child.question.id),
      ],
      [question.testId, result.question.testId],
    );
    return apiSuccess('Question updated successfully', result);
  }

  async remove(id: string): Promise<ApiResponse> {
    const question = await this.getOne(id);
    const children = await this.questionsRepository.find({
      where: { parentQuestionId: id, companyId: this.companyId },
      select: { id: true },
    });
    const childIds = children.map((child) => child.id);

    await this.dataSource.transaction(async (manager) => {
      await softDeleteIfExists(
        manager.getRepository(Question),
        { id, companyId: this.companyId },
        'Question not found',
      );
      await this.softDeleteQuestionContent(manager, [id]);
      await this.softDeleteQuestionIds(manager, childIds);
    });

    await this.clearQuestionCache(
      [id, question.parentQuestionId, ...childIds],
      [question.testId],
    );
    return apiSuccessMessage('Question deleted successfully');
  }

  private async assertPayloadRelations(
    dto: Pick<
      UpdateQuestionDto,
      'testId' | 'subjectId' | 'topicId' | 'questionData' | 'childQuestions'
    >,
  ): Promise<void> {
    if (dto.testId) {
      await this.testsService.assertExists(dto.testId);
    }

    if (dto.subjectId) {
      await this.subjectsService.assertExists(dto.subjectId);
    }

    if (dto.topicId) {
      await this.topicsService.assertExists(dto.topicId);
    }

    const questionData = [
      ...(dto.questionData ?? []),
      ...(dto.childQuestions ?? []).flatMap((child) => child.questionData),
    ];

    for (const item of questionData) {
      await this.languagesService.assertExists(item.languageId);
      await this.difficultiesService.assertExists(item.difficultyId);
    }
  }

  private assertChildQuestions(
    questionType: QuestionType,
    childQuestions: ChildQuestionDto[] | undefined,
    rejectIds: boolean,
  ) {
    if (!childQuestions?.length) {
      return;
    }

    if (questionType !== QuestionType.COMPREHENSION) {
      throw new BadRequestException(
        apiError(
          'childQuestions are only allowed when questionType is comprehension',
        ),
      );
    }

    const ids = childQuestions
      .map((child) => child.id)
      .filter((childId): childId is string => Boolean(childId));

    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException(
        apiError('childQuestions cannot contain duplicate id'),
      );
    }

    for (const child of childQuestions) {
      if (
        rejectIds &&
        (child.id || child.questionData.some((item) => item.id))
      ) {
        throw new BadRequestException(
          apiError('childQuestions.id is not allowed when creating a question'),
        );
      }

      this.assertQuestionTypes(child.questionType, child.questionData);
      this.assertUniqueLanguages(child.questionData);
    }
  }

  private async loadView(
    manager: EntityManager,
    question: Question,
  ): Promise<QuestionView> {
    const children = await manager.find(Question, {
      where: { parentQuestionId: question.id, companyId: this.companyId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    const questionIds = [question.id, ...children.map((child) => child.id)];
    const contents = await manager.find(QuestionContent, {
      where: { questionId: In(questionIds), companyId: this.companyId },
      order: { createdAt: 'ASC' },
    });
    const contentByQuestion = new Map<string, QuestionContent[]>();

    for (const content of contents) {
      const group = contentByQuestion.get(content.questionId) ?? [];
      group.push(content);
      contentByQuestion.set(content.questionId, group);
    }

    return {
      question,
      questionData: contentByQuestion.get(question.id) ?? [],
      childQuestions: children.map((child) => ({
        question: child,
        questionData: contentByQuestion.get(child.id) ?? [],
      })),
    };
  }

  private async replaceQuestionContent(
    manager: EntityManager,
    questionId: string,
    questionData: QuestionContentItemDto[],
  ): Promise<void> {
    const existing = await manager.find(QuestionContent, {
      where: { questionId, companyId: this.companyId },
    });
    const incomingIds = questionData
      .map((item) => item.id)
      .filter((contentId): contentId is string => Boolean(contentId));

    if (incomingIds.length) {
      const ownedIds = new Set(existing.map((item) => item.id));
      const invalidId = incomingIds.find(
        (contentId) => !ownedIds.has(contentId),
      );

      if (invalidId) {
        throw new BadRequestException(
          apiError('questionData.id does not belong to this question'),
        );
      }
    }

    const keepIds = new Set(incomingIds);
    const removeIds = existing
      .map((item) => item.id)
      .filter((contentId) => !keepIds.has(contentId));

    if (removeIds.length) {
      await manager.softDelete(QuestionContent, { id: In(removeIds) });
    }

    await manager.save(
      QuestionContent,
      questionData.map((item) =>
        manager.create(QuestionContent, {
          ...(item.id ? { id: item.id } : {}),
          ...this.toContentFields(questionId, item),
        }),
      ),
    );
  }

  private async replaceChildQuestions(
    manager: EntityManager,
    parent: Question,
    childQuestions: ChildQuestionDto[],
  ): Promise<string[]> {
    const existing = await manager.find(Question, {
      where: { parentQuestionId: parent.id, companyId: this.companyId },
    });
    const incomingIds = childQuestions
      .map((child) => child.id)
      .filter((childId): childId is string => Boolean(childId));
    const ownedIds = new Set(existing.map((child) => child.id));
    const invalidId = incomingIds.find((childId) => !ownedIds.has(childId));

    if (invalidId) {
      throw new BadRequestException(
        apiError('childQuestions.id does not belong to this question'),
      );
    }

    const keepIds = new Set(incomingIds);
    const removeIds = existing
      .map((child) => child.id)
      .filter((childId) => !keepIds.has(childId));

    await this.softDeleteQuestionIds(manager, removeIds);

    for (const [index, child] of childQuestions.entries()) {
      const previous = existing.find((item) => item.id === child.id);
      const savedChild = await manager.save(
        Question,
        manager.create(Question, {
          ...(child.id ? { id: child.id } : {}),
          companyId: this.companyId,
          parentQuestionId: parent.id,
          testId: parent.testId,
          subjectId: parent.subjectId,
          topicId: parent.topicId,
          questionType: child.questionType,
          isActive: child.isActive ?? previous?.isActive ?? true,
          sortOrder: index,
        }),
      );

      await this.replaceQuestionContent(
        manager,
        savedChild.id,
        child.questionData,
      );
    }

    return removeIds;
  }

  private async softDeleteQuestionIds(
    manager: EntityManager,
    ids: string[],
  ): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const deletedAt = new Date();

    await manager
      .createQueryBuilder()
      .update(Question)
      .set({ isActive: false, deletedAt })
      .where('id IN (:...ids)', { ids })
      .andWhere('company_id = :companyId', { companyId: this.companyId })
      .andWhere('deleted_at IS NULL')
      .execute();

    await this.softDeleteQuestionContent(manager, ids);
  }

  private async softDeleteQuestionContent(
    manager: EntityManager,
    questionIds: string[],
  ): Promise<void> {
    if (questionIds.length === 0) {
      return;
    }

    await manager
      .createQueryBuilder()
      .update(QuestionContent)
      .set({ deletedAt: new Date() })
      .where('question_id IN (:...questionIds)', { questionIds })
      .andWhere('company_id = :companyId', { companyId: this.companyId })
      .andWhere('deleted_at IS NULL')
      .execute();
  }

  private assertQuestionTypes(
    questionType: CreateQuestionDto['questionType'],
    questionData: Array<Pick<QuestionContentItemDto, 'questionType'>>,
  ) {
    const mismatched = questionData.some(
      (item) => item.questionType !== questionType,
    );

    if (mismatched) {
      throw new BadRequestException(
        apiError('questionData.questionType must match questionType'),
      );
    }
  }

  private assertUniqueLanguages(
    questionData: Array<Pick<QuestionContentItemDto, 'languageId'>>,
  ) {
    const languageIds = questionData.map((item) => item.languageId);

    if (new Set(languageIds).size !== languageIds.length) {
      throw new BadRequestException(
        apiError('questionData cannot contain duplicate languageId'),
      );
    }
  }

  private toContentFields(questionId: string, item: QuestionContentItemDto) {
    return {
      companyId: this.companyId,
      questionId,
      languageId: item.languageId,
      difficultyId: item.difficultyId,
      questionText: item.questionText ?? null,
      options: item.options ?? null,
      questionType: item.questionType,
      explanation: item.explanation ?? null,
      solutionUrl: item.solutionUrl ?? null,
      tags: item.tags ?? null,
      optionMarks: item.optionMarks ?? null,
      rangeFrom: item.rangeFrom ?? null,
      rangeTo: item.rangeTo ?? null,
      rightMarks: item.rightMarks ?? null,
      negativeMarks: item.negativeMarks ?? null,
    };
  }

  private async getOne(id: string): Promise<Question> {
    const question = await this.questionsRepository.findOne({
      where: { id, companyId: this.companyId },
    });

    if (!question) {
      throw new NotFoundException(apiError('Question not found'));
    }

    return question;
  }

  private async clearQuestionCache(
    ids: Array<string | null | undefined>,
    testIds: string[],
  ): Promise<void> {
    const itemKeys = [
      ...new Set(ids.filter((id): id is string => Boolean(id))),
    ].map((id) => questionsCache.itemKey(this.companyId, id));

    await clearCached(
      this.redis,
      questionsCache.listKeysKey(this.companyId),
      ...itemKeys,
      ...[...new Set(testIds)].flatMap((testId) => [
        testsCache.statsKey(this.companyId, testId),
        candidateExamCache.paperKey(this.companyId, testId),
      ]),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
