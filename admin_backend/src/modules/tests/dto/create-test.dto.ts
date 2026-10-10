import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { INT4_MAX } from '../../../common/constants/validation.constants';
import { trimString } from '../../../common/utils/string.util';

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

export class CreateTestDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  testCode!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  description?: string;

  @IsUUID()
  categoryId!: string;

  @IsUUID()
  primaryInstructionId!: string;

  @IsInt()
  @Min(1)
  @Max(INT4_MAX)
  durationMinutes!: number;

  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  handicappedDurationMinutes!: number;

  @IsInt()
  @Min(1)
  totalQuestions!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  totalMarks!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  passingMarks!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  graceMarks!: number;

  @IsOptional()
  @IsBoolean()
  isDraft?: boolean;

  @IsUUID()
  templateId!: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Matches(TIME_PATTERN)
  startBufferTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN)
  startTime?: string;

  @IsOptional()
  @Matches(TIME_PATTERN)
  endTime?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
