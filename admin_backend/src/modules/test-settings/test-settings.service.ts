import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CompanyContextService } from '../../common/auth/company-context.service';
import { getCache } from '../../common/cache/redis-cache.util';
import { RedisService } from '../../redis/redis.service';
import {
  ApiResponse,
  apiError,
  apiSuccess,
  apiSuccessMessage,
} from '../../common/utils/api-response.util';
import { softDeleteIfExists } from '../../common/utils/soft-delete.util';
import { candidateExamCache } from '../candidates/candidate-exam.cache';
import { TestsService } from '../tests/tests.service';
import { CreateTestSettingDto } from './dto/create-test-setting.dto';
import { UpdateTestSettingDto } from './dto/update-test-setting.dto';
import { TestSetting } from './entities/test-setting.entity';
import { testSettingsCache } from './test-settings.cache';

@Injectable()
export class TestSettingsService {
  constructor(
    @InjectRepository(TestSetting)
    private readonly testSettingsRepository: Repository<TestSetting>,
    private readonly companyContext: CompanyContextService,
    private readonly testsService: TestsService,
    private readonly redis: RedisService,
  ) {}

  async create(
    createTestSettingDto: CreateTestSettingDto,
  ): Promise<ApiResponse<TestSetting>> {
    await this.testsService.assertExists(createTestSettingDto.testId);

    const existing = await this.testSettingsRepository.findOne({
      where: { testId: createTestSettingDto.testId },
      withDeleted: true,
    });

    if (existing && !existing.deletedAt) {
      throw new ConflictException(
        apiError('Test settings already exist for this test'),
      );
    }

    if (existing?.deletedAt) {
      existing.deletedAt = null;
      existing.isActive = true;
      const restored = await this.testSettingsRepository.save(
        this.testSettingsRepository.merge(existing, createTestSettingDto),
      );

      await this.clearSettingCache(restored.id, restored.testId);
      return apiSuccess('Test setting created successfully', restored);
    }

    const setting = await this.testSettingsRepository.save(
      this.testSettingsRepository.create(createTestSettingDto),
    );

    await this.clearSettingCache(setting.id, setting.testId);
    return apiSuccess('Test setting created successfully', setting);
  }

  async findOne(id: string): Promise<ApiResponse<TestSetting>> {
    return getCache(
      this.redis,
      testSettingsCache.itemKey(this.companyId, id),
      testSettingsCache.ttlSeconds,
      async () =>
        apiSuccess('Test setting fetched successfully', await this.getOne(id)),
    );
  }

  async findOneByTestId(testId: string): Promise<ApiResponse<TestSetting>> {
    return getCache(
      this.redis,
      testSettingsCache.byTestKey(this.companyId, testId),
      testSettingsCache.ttlSeconds,
      async () => {
        await this.testsService.assertExists(testId);

        const setting = await this.testSettingsRepository.findOne({
          where: {
            testId,
            test: { companyId: this.companyId },
          },
        });

        if (!setting) {
          throw new NotFoundException(apiError('Test setting not found'));
        }

        return apiSuccess('Test setting fetched successfully', setting);
      },
    );
  }

  async update(
    id: string,
    updateTestSettingDto: UpdateTestSettingDto,
  ): Promise<ApiResponse<TestSetting>> {
    const setting = await this.getOne(id);
    const saved = await this.testSettingsRepository.save(
      this.testSettingsRepository.merge(setting, updateTestSettingDto),
    );

    await this.clearSettingCache(saved.id, saved.testId);
    return apiSuccess('Test setting updated successfully', saved);
  }

  async remove(id: string): Promise<ApiResponse> {
    const setting = await this.getOne(id);
    await softDeleteIfExists(
      this.testSettingsRepository,
      { id },
      'Test setting not found',
      {
        andWhere: `EXISTS (
          SELECT 1 FROM tests test
          WHERE test.id = test_settings.test_id
            AND test.company_id = :companyId
            AND test.deleted_at IS NULL
        )`,
        andWhereParams: { companyId: this.companyId },
      },
    );

    await this.clearSettingCache(setting.id, setting.testId);
    return apiSuccessMessage('Test setting deleted successfully');
  }

  private async getOne(id: string): Promise<TestSetting> {
    const setting = await this.testSettingsRepository.findOne({
      where: {
        id,
        test: { companyId: this.companyId },
      },
    });

    if (!setting) {
      throw new NotFoundException(apiError('Test setting not found'));
    }

    return setting;
  }

  private async clearSettingCache(id: string, testId: string): Promise<void> {
    await this.redis.delete(
      testSettingsCache.itemKey(this.companyId, id),
      testSettingsCache.byTestKey(this.companyId, testId),
      candidateExamCache.detailsKey(this.companyId, testId),
    );
  }

  private get companyId(): string {
    return this.companyContext.getCompanyId();
  }
}
