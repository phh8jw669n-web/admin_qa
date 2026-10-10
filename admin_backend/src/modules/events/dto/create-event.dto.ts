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

export class CreateEventDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  eventCode!: string;

  @IsEnum(ExamType)
  examType!: ExamType;

  @IsEnum(EventType)
  eventType!: EventType;

  @IsDateString()
  eventOpeningAt!: string;

  @IsDateString()
  eventClosingAt!: string;

  @IsOptional()
  @IsDateString()
  instructionAt?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  passwordInstruction?: string;

  @IsOptional()
  @IsBoolean()
  isPublish?: boolean;
}
