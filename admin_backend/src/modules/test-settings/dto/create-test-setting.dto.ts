import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { trimString } from '../../../common/utils/string.util';
import {
  ClockFormat,
  SectionQuestionNumbering,
} from '../enums/test-setting.enum';

export class CreateTestSettingDto {
  @IsUUID()
  testId!: string;

  @IsOptional()
  @IsBoolean()
  groupQuestionsBySubjectArea?: boolean;

  @IsOptional()
  @IsBoolean()
  groupQuestionsByTopic?: boolean;

  @IsOptional()
  @IsEnum(SectionQuestionNumbering)
  sectionQuestionNumbering?: SectionQuestionNumbering;

  @IsOptional()
  @IsBoolean()
  randomizeQuestionOrderWithinTopics?: boolean;

  @IsOptional()
  @IsBoolean()
  randomizeAnswerOptions?: boolean;

  @IsOptional()
  @IsBoolean()
  isAllQuestionsMandatory?: boolean;

  @IsOptional()
  @IsBoolean()
  showCorrectAnswerAfterAttempt?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePartialCredit?: boolean;

  @IsOptional()
  @IsBoolean()
  enableGenericPlugin?: boolean;

  @IsOptional()
  @IsBoolean()
  showInternetSpeed?: boolean;

  @IsOptional()
  @IsBoolean()
  enablePartialMarking?: boolean;

  @IsOptional()
  @IsBoolean()
  enableScientificCalculator?: boolean;

  @IsOptional()
  @IsBoolean()
  enableActivityLog?: boolean;

  @IsOptional()
  @IsBoolean()
  showIncorrectWordsTyped?: boolean;

  @IsOptional()
  @IsBoolean()
  enableBackspace?: boolean;

  @IsOptional()
  @IsBoolean()
  allowQuestionNavigation?: boolean;

  @IsOptional()
  @IsBoolean()
  showMarksDuringTest?: boolean;

  @IsOptional()
  @IsBoolean()
  enableMultipleLanguages?: boolean;

  @IsOptional()
  @IsBoolean()
  showQuestionInSingleLine?: boolean;

  @IsOptional()
  @IsBoolean()
  showDefaultCalculator?: boolean;

  @IsOptional()
  @IsBoolean()
  enableOfflineMode?: boolean;

  @IsOptional()
  @IsBoolean()
  enableSecureBrowser?: boolean;

  @IsOptional()
  @IsBoolean()
  isTestTimeBound?: boolean;

  @IsOptional()
  @IsEnum(ClockFormat)
  clockFormat?: ClockFormat;

  @IsOptional()
  @IsBoolean()
  enableSections?: boolean;

  @IsOptional()
  @IsBoolean()
  showPersonalizedMessage?: boolean;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  passFeedbackMessage?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  failFeedbackMessage?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  submissionMessage?: string;

  @IsOptional()
  @IsBoolean()
  enableCandidateFeedback?: boolean;
}
