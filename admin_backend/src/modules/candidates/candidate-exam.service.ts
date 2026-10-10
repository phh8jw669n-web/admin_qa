import { randomUUID } from 'crypto';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { CompanyContextService } from '../../common/auth/company-context.service';
import { getCache } from '../../common/cache/redis-cache.util';
import { RedisService } from '../../redis/redis.service';
import {
  ApiResponse,
  apiError,
  apiSuccess,
} from '../../common/utils/api-response.util';
import { InstructionLanguage } from '../instructions/instruction-languages/entities/instruction-language.entity';
import { QuestionContent } from '../questions/entities/question-content.entity';
import { Question } from '../questions/entities/question.entity';
import { QuestionType } from '../questions/enums/question.enum';
import { TestCandidateMapping } from '../test-candidate-mappings/entities/test-candidate-mapping.entity';
import { TestSetting } from '../test-settings/entities/test-setting.entity';
import {
  ClockFormat,
  SectionQuestionNumbering,
} from '../test-settings/enums/test-setting.enum';
import { Test } from '../tests/entities/test.entity';
import { candidateExamCache } from './candidate-exam.cache';

const PAPER_LOCK_POLL_MS = 100;
const RELEASE_PAPER_LOCK = `
if redis.call('GET', KEYS[1]) == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

type ExamChoice = { id: string; text: string };

type ExamOptions =
  { options: ExamChoice[] } | { answerType: 'alphanumeric' | 'numbers' } | null;

type ExamQuestionContent = {
  id: string;
  languageId: string;
  languageName: string;
  questionText: string | null;
  options: ExamOptions;
  rightMarks: number | null;
  negativeMarks: number | null;
};

type ExamQuestion = {
  id: string;
  questionType: QuestionType;
  sortOrder: number;
  questionData: ExamQuestionContent[];
  childQuestions: ExamQuestion[];
};

type ExamTopicSection = {
  sectionNo: number;
  topic: { id: string; name: string };
  questions: ExamQuestion[];
};

type ExamSubject = {
  id: string;
  name: string;
  sections: ExamTopicSection[];
};

type ExamPaper = {
  testId: string;
  subjects: ExamSubject[];
};

type ExamInstruction = {
  id: string;
  languageId: string;
  languageName: string;
  content: string;
  isActive: boolean;
};

type ExamTestSettings = {
  id: string;
  groupQuestionsBySubjectArea: boolean;
  groupQuestionsByTopic: boolean;
  sectionQuestionNumbering: SectionQuestionNumbering;
  randomizeQuestionOrderWithinTopics: boolean;
  randomizeAnswerOptions: boolean;
  isAllQuestionsMandatory: boolean;
  showCorrectAnswerAfterAttempt: boolean;
  enablePartialCredit: boolean;
  enableGenericPlugin: boolean;
  showInternetSpeed: boolean;
  enablePartialMarking: boolean;
  enableScientificCalculator: boolean;
  enableActivityLog: boolean;
  showIncorrectWordsTyped: boolean;
  enableBackspace: boolean;
  allowQuestionNavigation: boolean;
  showMarksDuringTest: boolean;
  enableMultipleLanguages: boolean;
  showQuestionInSingleLine: boolean;
  showDefaultCalculator: boolean;
  enableOfflineMode: boolean;
  enableSecureBrowser: boolean;
  isTestTimeBound: boolean;
  clockFormat: ClockFormat;
  enableSections: boolean;
  showPersonalizedMessage: boolean;
  passFeedbackMessage: string | null;
  failFeedbackMessage: string | null;
  submissionMessage: string | null;
  enableCandidateFeedback: boolean;
  isActive: boolean;
};

type ExamDetails = {
  id: string;
  name: string;
  testCode: string;
  description: string | null;
  categoryId: string;
  categoryName: string;
  primaryInstructionId: string;
  instructions: ExamInstruction[];
  durationMinutes: number;
  handicappedDurationMinutes: number;
  totalQuestions: number;
  totalMarks: number;
  passingMarks: number;
  graceMarks: number;
  isDraft: boolean;
  templateId: string;
  isPublished: boolean;
  startDate: string | null;
  endDate: string | null;
  startBufferTime: string | null;
  startTime: string | null;
  endTime: string | null;
  isActive: boolean;
  settings: ExamTestSettings | null;
};

@Injectable()
export class CandidateExamService {
  constructor(
    @InjectRepository(Test)
    private readonly testsRepository: Repository<Test>,
    @InjectRepository(TestCandidateMapping)
    private readonly mappingsRepository: Repository<TestCandidateMapping>,
    @InjectRepository(TestSetting)
    private readonly settingsRepository: Repository<TestSetting>,
    @InjectRepository(InstructionLanguage)
    private readonly instructionLanguagesRepository: Repository<InstructionLanguage>,
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    @InjectRepository(QuestionContent)
    private readonly contentsRepository: Repository<QuestionContent>,
    private readonly companyContext: CompanyContextService,
    private readonly redis: RedisService,
  ) {}

  async findPaper(testId: string): Promise<ApiResponse<ExamPaper>> {
    const companyId = this.companyContext.getCompanyId();
    const candidateId = this.companyContext.getUserId();

    await this.assertAssigned(companyId, candidateId, testId);

    const subjects = await this.loadCached(
      candidateExamCache.paperKey(companyId, testId),
      candidateExamCache.lockKey(companyId, testId),
      () => this.loadSubjects(companyId, testId),
      (value): value is ExamSubject[] => Array.isArray(value),
    );

    return apiSuccess('Exam paper fetched successfully', {
      testId,
      subjects,
    });
  }

  async findDetails(testId: string): Promise<ApiResponse<ExamDetails>> {
    const companyId = this.companyContext.getCompanyId();
    const candidateId = this.companyContext.getUserId();

    await this.assertAssigned(companyId, candidateId, testId);

    const details = await this.loadCached(
      candidateExamCache.detailsKey(companyId, testId),
      candidateExamCache.detailsLockKey(companyId, testId),
      () => this.loadDetails(companyId, testId),
      isExamDetails,
    );

    return apiSuccess('Exam details fetched successfully', details);
  }

  private async assertAssigned(
    companyId: string,
    candidateId: string,
    testId: string,
  ): Promise<void> {
    const [testExists, mapped] = await Promise.all([
      this.testsRepository.existsBy({ id: testId, companyId, isActive: true }),
      this.mappingsRepository.existsBy({ companyId, candidateId, testId }),
    ]);

    if (!testExists) {
      throw new NotFoundException(apiError('Test not found'));
    }

    if (!mapped) {
      throw new ForbiddenException(apiError('You are not mapped to this test'));
    }
  }

  private async loadCached<T>(
    key: string,
    lockKey: string,
    load: () => Promise<T>,
    isHit: (value: unknown) => value is T,
  ): Promise<T> {
    const cached = await this.readCached(key, isHit);

    if (cached) {
      return cached;
    }

    if (!this.redis.getClient()) {
      return load();
    }

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const token = randomUUID();

      if (await this.tryLock(lockKey, token)) {
        try {
          return await getCache(
            this.redis,
            key,
            candidateExamCache.ttlSeconds,
            load,
          );
        } finally {
          await this.releaseLock(lockKey, token);
        }
      }

      const waited = await this.waitForCached(key, lockKey, isHit);

      if (waited) {
        return waited;
      }
    }

    return getCache(this.redis, key, candidateExamCache.ttlSeconds, load);
  }

  private async tryLock(lockKey: string, token: string): Promise<boolean> {
    const client = this.redis.getClient();

    if (!client) {
      return false;
    }

    try {
      const result = await client.set(
        lockKey,
        token,
        'EX',
        candidateExamCache.lockTtlSeconds,
        'NX',
      );
      return result === 'OK';
    } catch {
      return false;
    }
  }

  private async releaseLock(lockKey: string, token: string): Promise<void> {
    const client = this.redis.getClient();

    if (!client) {
      return;
    }

    try {
      await client.eval(RELEASE_PAPER_LOCK, 1, lockKey, token);
    } catch {
      return;
    }
  }

  private async waitForCached<T>(
    key: string,
    lockKey: string,
    isHit: (value: unknown) => value is T,
  ): Promise<T | null> {
    const deadline = Date.now() + candidateExamCache.lockTtlSeconds * 1000;

    while (Date.now() < deadline) {
      const cached = await this.readCached(key, isHit);

      if (cached) {
        return cached;
      }

      const lockHeld = await this.redis.get(lockKey);

      if (!lockHeld) {
        return null;
      }

      await delay(PAPER_LOCK_POLL_MS);
    }

    return null;
  }

  private async readCached<T>(
    key: string,
    isHit: (value: unknown) => value is T,
  ): Promise<T | null> {
    try {
      const raw = await this.redis.get(key);

      if (!raw) {
        return null;
      }

      const parsed: unknown = JSON.parse(raw);
      return isHit(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private async loadDetails(
    companyId: string,
    testId: string,
  ): Promise<ExamDetails> {
    const test = await this.testsRepository.findOne({
      where: { id: testId, companyId, isActive: true },
      relations: { category: true },
    });

    if (!test) {
      throw new NotFoundException(apiError('Test not found'));
    }

    const [settings, instructions] = await Promise.all([
      this.settingsRepository.findOne({ where: { testId } }),
      this.instructionLanguagesRepository.find({
        where: {
          companyId,
          instructionId: test.primaryInstructionId,
        },
        relations: { language: true },
        order: { createdAt: 'ASC' },
      }),
    ]);

    return this.toDetails(test, settings, instructions);
  }

  private toDetails(
    test: Test,
    settings: TestSetting | null,
    instructions: InstructionLanguage[],
  ): ExamDetails {
    return {
      id: test.id,
      name: test.name,
      testCode: test.testCode,
      description: test.description,
      categoryId: test.categoryId,
      categoryName: test.category?.name ?? '',
      primaryInstructionId: test.primaryInstructionId,
      instructions: instructions.map((instruction) => ({
        id: instruction.id,
        languageId: instruction.languageId,
        languageName: instruction.language?.name ?? '',
        content: instruction.content,
        isActive: instruction.isActive,
      })),
      durationMinutes: test.durationMinutes,
      handicappedDurationMinutes: test.handicappedDurationMinutes,
      totalQuestions: test.totalQuestions,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
      graceMarks: test.graceMarks,
      isDraft: test.isDraft,
      templateId: test.templateId,
      isPublished: test.isPublished,
      startDate: test.startDate,
      endDate: test.endDate,
      startBufferTime: test.startBufferTime,
      startTime: test.startTime,
      endTime: test.endTime,
      isActive: test.isActive,
      settings: settings ? this.toSettings(settings) : null,
    };
  }

  private toSettings(settings: TestSetting): ExamTestSettings {
    return {
      id: settings.id,
      groupQuestionsBySubjectArea: settings.groupQuestionsBySubjectArea,
      groupQuestionsByTopic: settings.groupQuestionsByTopic,
      sectionQuestionNumbering: settings.sectionQuestionNumbering,
      randomizeQuestionOrderWithinTopics:
        settings.randomizeQuestionOrderWithinTopics,
      randomizeAnswerOptions: settings.randomizeAnswerOptions,
      isAllQuestionsMandatory: settings.isAllQuestionsMandatory,
      showCorrectAnswerAfterAttempt: settings.showCorrectAnswerAfterAttempt,
      enablePartialCredit: settings.enablePartialCredit,
      enableGenericPlugin: settings.enableGenericPlugin,
      showInternetSpeed: settings.showInternetSpeed,
      enablePartialMarking: settings.enablePartialMarking,
      enableScientificCalculator: settings.enableScientificCalculator,
      enableActivityLog: settings.enableActivityLog,
      showIncorrectWordsTyped: settings.showIncorrectWordsTyped,
      enableBackspace: settings.enableBackspace,
      allowQuestionNavigation: settings.allowQuestionNavigation,
      showMarksDuringTest: settings.showMarksDuringTest,
      enableMultipleLanguages: settings.enableMultipleLanguages,
      showQuestionInSingleLine: settings.showQuestionInSingleLine,
      showDefaultCalculator: settings.showDefaultCalculator,
      enableOfflineMode: settings.enableOfflineMode,
      enableSecureBrowser: settings.enableSecureBrowser,
      isTestTimeBound: settings.isTestTimeBound,
      clockFormat: settings.clockFormat,
      enableSections: settings.enableSections,
      showPersonalizedMessage: settings.showPersonalizedMessage,
      passFeedbackMessage: settings.passFeedbackMessage,
      failFeedbackMessage: settings.failFeedbackMessage,
      submissionMessage: settings.submissionMessage,
      enableCandidateFeedback: settings.enableCandidateFeedback,
      isActive: settings.isActive,
    };
  }

  private async loadSubjects(
    companyId: string,
    testId: string,
  ): Promise<ExamSubject[]> {
    const questions = await this.questionsRepository.find({
      where: {
        companyId,
        testId,
        isActive: true,
        parentQuestionId: IsNull(),
      },
      relations: { subject: true, topic: true },
    });

    const children = questions.length
      ? await this.questionsRepository.find({
          where: {
            companyId,
            testId,
            isActive: true,
            parentQuestionId: In(questions.map((question) => question.id)),
          },
        })
      : [];

    const contentQuestionIds = [
      ...questions.map((question) => question.id),
      ...children.map((question) => question.id),
    ];
    const contents = contentQuestionIds.length
      ? await this.contentsRepository.find({
          where: { companyId, questionId: In(contentQuestionIds) },
          relations: { language: true },
          order: { createdAt: 'ASC' },
        })
      : [];

    const contentByQuestion = new Map<string, QuestionContent[]>();
    for (const content of contents) {
      const group = contentByQuestion.get(content.questionId) ?? [];
      group.push(content);
      contentByQuestion.set(content.questionId, group);
    }

    const childrenByParent = new Map<string, Question[]>();
    for (const child of children) {
      if (!child.parentQuestionId) {
        continue;
      }
      const group = childrenByParent.get(child.parentQuestionId) ?? [];
      group.push(child);
      childrenByParent.set(child.parentQuestionId, group);
    }

    return this.toSubjects(questions, childrenByParent, contentByQuestion);
  }

  private toSubjects(
    questions: Question[],
    childrenByParent: Map<string, Question[]>,
    contentByQuestion: Map<string, QuestionContent[]>,
  ): ExamSubject[] {
    const subjects = new Map<
      string,
      {
        id: string;
        name: string;
        ranking: number;
        topics: Map<string, ExamTopicSection & { ranking: number }>;
      }
    >();

    const ordered = [...questions].sort((left, right) => {
      const bySubject =
        left.subject.ranking - right.subject.ranking ||
        left.subject.name.localeCompare(right.subject.name);
      if (bySubject !== 0) {
        return bySubject;
      }
      const byTopic =
        left.topic.ranking - right.topic.ranking ||
        left.topic.name.localeCompare(right.topic.name);
      if (byTopic !== 0) {
        return byTopic;
      }
      return (
        left.sortOrder - right.sortOrder ||
        left.createdAt.getTime() - right.createdAt.getTime()
      );
    });

    for (const question of ordered) {
      let subject = subjects.get(question.subjectId);
      if (!subject) {
        subject = {
          id: question.subject.id,
          name: question.subject.name,
          ranking: question.subject.ranking,
          topics: new Map(),
        };
        subjects.set(question.subjectId, subject);
      }

      let section = subject.topics.get(question.topicId);
      if (!section) {
        section = {
          sectionNo: subject.topics.size + 1,
          ranking: question.topic.ranking,
          topic: { id: question.topic.id, name: question.topic.name },
          questions: [],
        };
        subject.topics.set(question.topicId, section);
      }

      section.questions.push(
        this.toQuestion(question, childrenByParent, contentByQuestion),
      );
    }

    return [...subjects.values()]
      .sort(
        (left, right) =>
          left.ranking - right.ranking || left.name.localeCompare(right.name),
      )
      .map(({ id, name, topics }) => ({
        id,
        name,
        sections: [...topics.values()]
          .sort(
            (left, right) =>
              left.ranking - right.ranking ||
              left.topic.name.localeCompare(right.topic.name),
          )
          .map(({ sectionNo, topic, questions: sectionQuestions }) => ({
            sectionNo,
            topic,
            questions: sectionQuestions,
          })),
      }));
  }

  private toQuestion(
    question: Question,
    childrenByParent: Map<string, Question[]>,
    contentByQuestion: Map<string, QuestionContent[]>,
  ): ExamQuestion {
    const children = [...(childrenByParent.get(question.id) ?? [])].sort(
      (left, right) =>
        left.sortOrder - right.sortOrder ||
        left.createdAt.getTime() - right.createdAt.getTime(),
    );

    return {
      id: question.id,
      questionType: question.questionType,
      sortOrder: question.sortOrder,
      questionData: this.toQuestionData(question, contentByQuestion),
      childQuestions: children.map((child) =>
        this.toQuestion(child, childrenByParent, contentByQuestion),
      ),
    };
  }

  private toQuestionData(
    question: Question,
    contentByQuestion: Map<string, QuestionContent[]>,
  ): ExamQuestionContent[] {
    return (contentByQuestion.get(question.id) ?? []).map((content) => ({
      id: content.id,
      languageId: content.languageId,
      languageName: content.language?.name ?? '',
      questionText: content.questionText,
      options: this.toExamOptions(question.questionType, content.options),
      rightMarks: content.rightMarks,
      negativeMarks: content.negativeMarks,
    }));
  }

  private toExamOptions(
    questionType: QuestionType,
    options: QuestionContent['options'],
  ): ExamOptions {
    if (questionType === QuestionType.COMPREHENSION || options == null) {
      return null;
    }

    if (typeof options !== 'object' || Array.isArray(options)) {
      return null;
    }

    if (questionType === QuestionType.FILL_IN_THE_BLANKS) {
      const answerType = options.answerType;
      if (answerType !== 'alphanumeric' && answerType !== 'numbers') {
        return null;
      }
      return { answerType };
    }

    const choices = options.options;
    if (!Array.isArray(choices)) {
      return null;
    }

    return {
      options: choices.flatMap((choice) => {
        if (!choice || typeof choice !== 'object' || Array.isArray(choice)) {
          return [];
        }
        const item = choice as { id?: unknown; text?: unknown };
        if (typeof item.id !== 'string' || typeof item.text !== 'string') {
          return [];
        }
        return [{ id: item.id, text: item.text }];
      }),
    };
  }
}

function isExamDetails(value: unknown): value is ExamDetails {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
