import {
  ApiProperty,
  ApiPropertyOptional,
  getSchemaPath,
} from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
  ValidateNested,
} from 'class-validator';
import { trimString } from '../../../common/utils/string.util';
import { QuestionType } from '../enums/question.enum';
import { QuestionOptionsByTypeConstraint } from '../validators/question-options.validator';
import {
  FillInTheBlanksOptionsDto,
  MultipleChoiceOptionsDto,
  SingleChoiceOptionsDto,
} from './question-options.swagger';

export class QuestionContentItemDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Optional. Send only when updating an existing language row.',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Required. Language for this text.',
  })
  @IsUUID()
  languageId!: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Required. Any difficulty that exists for the company. It does not have to belong to languageId.',
  })
  @IsUUID()
  difficultyId!: string;

  @ApiPropertyOptional({
    description:
      'Optional. Question text. For a comprehension, this is the passage.',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  questionText?: string;

  @ApiProperty({
    enum: QuestionType,
    description:
      'Required. Must match the question questionType, or the child questionType.',
  })
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @ApiProperty({
    required: true,
    nullable: true,
    description:
      'Required. single_choice: at least 2 choices and exactly 1 correctOptions id. multiple_choice: at least 2 choices and at least 2 correctOptions ids. fill_in_the_blanks: { answerType: alphanumeric | numbers, answer }. comprehension: null.',
    oneOf: [
      { $ref: getSchemaPath(SingleChoiceOptionsDto) },
      { $ref: getSchemaPath(MultipleChoiceOptionsDto) },
      { $ref: getSchemaPath(FillInTheBlanksOptionsDto) },
    ],
  })
  @Validate(QuestionOptionsByTypeConstraint)
  options?: Record<string, unknown> | null;

  @ApiPropertyOptional({ description: 'Optional. Solution note.' })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ description: 'Optional. Solution link.' })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  solutionUrl?: string;

  @ApiPropertyOptional({
    maxLength: 200,
    description: 'Optional. Maximum 200 characters.',
  })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(200)
  tags?: string;

  @ApiPropertyOptional({ description: 'Optional.' })
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  optionMarks?: string;

  @ApiPropertyOptional({ description: 'Optional. Up to 2 decimal places.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  rangeFrom?: number;

  @ApiPropertyOptional({ description: 'Optional. Up to 2 decimal places.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  rangeTo?: number;

  @ApiPropertyOptional({ description: 'Optional. Up to 2 decimal places.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  rightMarks?: number;

  @ApiPropertyOptional({ description: 'Optional. Up to 2 decimal places.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  negativeMarks?: number;
}

const childQuestionTypes = [
  QuestionType.SINGLE_CHOICE,
  QuestionType.MULTIPLE_CHOICE,
  QuestionType.FILL_IN_THE_BLANKS,
] as const;

export class ChildQuestionDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Optional. Send only when updating a child that already belongs to this comprehension.',
  })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({
    enum: childQuestionTypes,
    description:
      'Required. single_choice, multiple_choice, or fill_in_the_blanks.',
  })
  @IsIn(childQuestionTypes)
  questionType!: (typeof childQuestionTypes)[number];

  @ApiPropertyOptional({
    default: true,
    description: 'Optional. Defaults to true.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    type: [QuestionContentItemDto],
    minItems: 1,
    description:
      'Required. One object per language. languageId cannot repeat inside this child.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionContentItemDto)
  questionData!: QuestionContentItemDto[];
}

export class CreateQuestionDto {
  @ApiProperty({ format: 'uuid', description: 'Required.' })
  @IsUUID()
  testId!: string;

  @ApiProperty({ format: 'uuid', description: 'Required.' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ format: 'uuid', description: 'Required.' })
  @IsUUID()
  topicId!: string;

  @ApiProperty({
    enum: QuestionType,
    description:
      'Required. Select a request example in Swagger to fill the body for this type.',
  })
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @ApiPropertyOptional({
    default: true,
    description: 'Optional. Defaults to true.',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    type: [QuestionContentItemDto],
    minItems: 1,
    description:
      'Required. One object per language. languageId cannot repeat. Every item questionType must match questionType.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => QuestionContentItemDto)
  questionData!: QuestionContentItemDto[];

  @ApiPropertyOptional({
    type: [ChildQuestionDto],
    description:
      'Optional, and only for questionType comprehension. Each child counts toward the test question limit. The passage does not. Sending this on update replaces the child set.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChildQuestionDto)
  childQuestions?: ChildQuestionDto[];
}
