import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { trimString } from '../../../common/utils/string.util';
import { ExamType, EventType } from '../enums/event.enum';

export class UpdateEventDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  eventCode?: string;

  @IsOptional()
  @IsEnum(ExamType)
  examType?: ExamType;

  @IsOptional()
  @IsEnum(EventType)
  eventType?: EventType;

  @IsOptional()
  @IsDateString()
  eventOpeningAt?: string;

  @IsOptional()
  @IsDateString()
  eventClosingAt?: string;

  @IsOptional()
  @IsDateString()
  instructionAt?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  passwordInstruction?: string | null;

  @IsOptional()
  @IsBoolean()
  isPublish?: boolean;
}
