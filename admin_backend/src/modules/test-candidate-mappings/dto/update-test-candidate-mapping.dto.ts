import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsIP,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';
import { INT4_MAX } from '../../../common/constants/validation.constants';
import { TestCandidateMappingStatus } from '../enums/test-candidate-mapping.enum';

export class UpdateTestCandidateMappingDto {
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsUUID()
  testId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(INT4_MAX)
  attemptNo?: number;

  @IsOptional()
  @IsEnum(TestCandidateMappingStatus)
  status?: TestCandidateMappingStatus;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  startedAt?: string | null;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  completedAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  attemptedQuestions?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  correctAnswers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  wrongAnswers?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  score?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  percentage?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  rank?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  result?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  timeTakenSeconds?: number;

  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsIP()
  ipAddress?: string | null;
}
