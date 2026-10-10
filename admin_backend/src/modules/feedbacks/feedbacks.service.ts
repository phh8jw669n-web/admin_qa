import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyContextService } from '../../common/auth/company-context.service';
import {
  ApiResponse,
  apiError,
  apiSuccess,
} from '../../common/utils/api-response.util';
import { TestCandidateMapping } from '../test-candidate-mappings/entities/test-candidate-mapping.entity';
import { Test } from '../tests/entities/test.entity';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { Feedback } from './entities/feedback.entity';

@Injectable()
export class FeedbacksService {
  constructor(
    @InjectRepository(Feedback)
    private readonly feedbacksRepository: Repository<Feedback>,
    @InjectRepository(Test)
    private readonly testsRepository: Repository<Test>,
    @InjectRepository(TestCandidateMapping)
    private readonly mappingsRepository: Repository<TestCandidateMapping>,
    private readonly companyContext: CompanyContextService,
  ) {}

  async create(
    testId: string,
    dto: CreateFeedbackDto,
  ): Promise<ApiResponse<Feedback>> {
    const companyId = this.companyContext.getCompanyId();
    const studentId = this.companyContext.getUserId();

    const [testExists, mapped, alreadySubmitted] = await Promise.all([
      this.testsRepository.existsBy({ id: testId, companyId, isActive: true }),
      this.mappingsRepository.existsBy({
        companyId,
        candidateId: studentId,
        testId,
      }),
      this.feedbacksRepository.existsBy({ companyId, studentId, testId }),
    ]);

    if (!testExists) {
      throw new NotFoundException(apiError('Test not found'));
    }

    if (!mapped) {
      throw new ForbiddenException(apiError('You are not mapped to this test'));
    }

    if (alreadySubmitted) {
      throw new ConflictException(
        apiError('You have already submitted feedback for this test'),
      );
    }

    const feedback = await this.feedbacksRepository.save(
      this.feedbacksRepository.create({
        studentId,
        companyId,
        testId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      }),
    );

    return apiSuccess('Feedback submitted successfully', feedback);
  }
}
