import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { QuestionType } from '../../questions/enums/question.enum';

export class ExamChoiceResponseDto {
  @ApiProperty({ example: 'a' })
  id!: string;

  @ApiProperty({ example: '4' })
  text!: string;
}

export class ExamChoiceOptionsResponseDto {
  @ApiProperty({
    type: [ExamChoiceResponseDto],
    description: 'Choice text only. correctOptions is omitted.',
  })
  options!: ExamChoiceResponseDto[];
}

export class ExamFillOptionsResponseDto {
  @ApiProperty({
    enum: ['alphanumeric', 'numbers'],
    description: 'Blank type only. The correct answer is omitted.',
  })
  answerType!: 'alphanumeric' | 'numbers';
}

export class ExamQuestionContentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  languageId!: string;

  @ApiProperty({ example: 'English' })
  languageName!: string;

  @ApiProperty({ nullable: true, example: 'What is 2 + 2?' })
  questionText!: string | null;

  @ApiProperty({
    nullable: true,
    description:
      'single_choice and multiple_choice return { options }. fill_in_the_blanks returns { answerType }. comprehension is null.',
    oneOf: [
      { $ref: getSchemaPath(ExamChoiceOptionsResponseDto) },
      { $ref: getSchemaPath(ExamFillOptionsResponseDto) },
    ],
  })
  options!: ExamChoiceOptionsResponseDto | ExamFillOptionsResponseDto | null;

  @ApiProperty({ nullable: true, example: 1 })
  rightMarks!: number | null;

  @ApiProperty({ nullable: true, example: 0 })
  negativeMarks!: number | null;
}

export class ExamQuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: QuestionType })
  questionType!: QuestionType;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({
    type: [ExamQuestionContentResponseDto],
    description: 'One item per language. Match a child language by languageId.',
  })
  questionData!: ExamQuestionContentResponseDto[];

  @ApiProperty({
    type: () => ExamQuestionResponseDto,
    isArray: true,
    description:
      'Child questions of a comprehension, in sortOrder. Empty for every other type.',
  })
  childQuestions!: ExamQuestionResponseDto[];
}

export class ExamTopicResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Tenses' })
  name!: string;
}

export class ExamSectionResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Restarts at 1 inside each subject. One section per topic.',
  })
  sectionNo!: number;

  @ApiProperty({ type: ExamTopicResponseDto })
  topic!: ExamTopicResponseDto;

  @ApiProperty({ type: [ExamQuestionResponseDto] })
  questions!: ExamQuestionResponseDto[];
}

export class ExamSubjectResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Grammar' })
  name!: string;

  @ApiProperty({ type: [ExamSectionResponseDto] })
  sections!: ExamSectionResponseDto[];
}

export class ExamPaperDataDto {
  @ApiProperty({ format: 'uuid' })
  testId!: string;

  @ApiProperty({ type: [ExamSubjectResponseDto] })
  subjects!: ExamSubjectResponseDto[];
}

export class ExamPaperResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Exam paper fetched successfully' })
  message!: string;

  @ApiProperty({ type: ExamPaperDataDto })
  data!: ExamPaperDataDto;
}
