import { ApiProperty } from '@nestjs/swagger';
import {
  ClockFormat,
  SectionQuestionNumbering,
} from '../../test-settings/enums/test-setting.enum';

export class ExamInstructionResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  languageId!: string;

  @ApiProperty({ example: 'English' })
  languageName!: string;

  @ApiProperty({
    example:
      'Read each question carefully. One mark is deducted for a wrong answer.',
  })
  content!: string;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

export class ExamTestSettingsResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: true })
  groupQuestionsBySubjectArea!: boolean;

  @ApiProperty({ example: true })
  groupQuestionsByTopic!: boolean;

  @ApiProperty({
    enum: SectionQuestionNumbering,
    example: SectionQuestionNumbering.CONTINUOUS,
  })
  sectionQuestionNumbering!: SectionQuestionNumbering;

  @ApiProperty({ example: false })
  randomizeQuestionOrderWithinTopics!: boolean;

  @ApiProperty({ example: false })
  randomizeAnswerOptions!: boolean;

  @ApiProperty({ example: true })
  isAllQuestionsMandatory!: boolean;

  @ApiProperty({ example: false })
  showCorrectAnswerAfterAttempt!: boolean;

  @ApiProperty({ example: false })
  enablePartialCredit!: boolean;

  @ApiProperty({ example: false })
  enableGenericPlugin!: boolean;

  @ApiProperty({ example: false })
  showInternetSpeed!: boolean;

  @ApiProperty({ example: false })
  enablePartialMarking!: boolean;

  @ApiProperty({ example: false })
  enableScientificCalculator!: boolean;

  @ApiProperty({ example: true })
  enableActivityLog!: boolean;

  @ApiProperty({ example: false })
  showIncorrectWordsTyped!: boolean;

  @ApiProperty({ example: true })
  enableBackspace!: boolean;

  @ApiProperty({ example: true })
  allowQuestionNavigation!: boolean;

  @ApiProperty({ example: true })
  showMarksDuringTest!: boolean;

  @ApiProperty({ example: true })
  enableMultipleLanguages!: boolean;

  @ApiProperty({ example: false })
  showQuestionInSingleLine!: boolean;

  @ApiProperty({ example: false })
  showDefaultCalculator!: boolean;

  @ApiProperty({ example: false })
  enableOfflineMode!: boolean;

  @ApiProperty({ example: true })
  enableSecureBrowser!: boolean;

  @ApiProperty({ example: true })
  isTestTimeBound!: boolean;

  @ApiProperty({ enum: ClockFormat, example: ClockFormat.MM_SS })
  clockFormat!: ClockFormat;

  @ApiProperty({ example: true })
  enableSections!: boolean;

  @ApiProperty({ example: true })
  showPersonalizedMessage!: boolean;

  @ApiProperty({ nullable: true, example: 'You have passed.' })
  passFeedbackMessage!: string | null;

  @ApiProperty({ nullable: true, example: 'You have not passed.' })
  failFeedbackMessage!: string | null;

  @ApiProperty({ nullable: true, example: 'Your test has been submitted.' })
  submissionMessage!: string | null;

  @ApiProperty({ example: false })
  enableCandidateFeedback!: boolean;

  @ApiProperty({ example: true })
  isActive!: boolean;
}

export class ExamDetailsDataDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Cache Test' })
  name!: string;

  @ApiProperty({ example: 'CT01' })
  testCode!: string;

  @ApiProperty({ nullable: true, example: 'Grammar and comprehension test.' })
  description!: string | null;

  @ApiProperty({ format: 'uuid' })
  categoryId!: string;

  @ApiProperty({ example: 'Scholarship' })
  categoryName!: string;

  @ApiProperty({ format: 'uuid' })
  primaryInstructionId!: string;

  @ApiProperty({
    type: [ExamInstructionResponseDto],
    description:
      'Every language row saved for primaryInstructionId. Match the text by languageId.',
  })
  instructions!: ExamInstructionResponseDto[];

  @ApiProperty({ example: 60 })
  durationMinutes!: number;

  @ApiProperty({ example: 80 })
  handicappedDurationMinutes!: number;

  @ApiProperty({ example: 6 })
  totalQuestions!: number;

  @ApiProperty({ example: 10 })
  totalMarks!: number;

  @ApiProperty({ example: 4 })
  passingMarks!: number;

  @ApiProperty({ example: 0 })
  graceMarks!: number;

  @ApiProperty({ example: false })
  isDraft!: boolean;

  @ApiProperty({ format: 'uuid' })
  templateId!: string;

  @ApiProperty({ example: true })
  isPublished!: boolean;

  @ApiProperty({ nullable: true, example: '2026-10-08' })
  startDate!: string | null;

  @ApiProperty({ nullable: true, example: '2026-10-08' })
  endDate!: string | null;

  @ApiProperty({ nullable: true, example: '00:15:00' })
  startBufferTime!: string | null;

  @ApiProperty({ nullable: true, example: '09:00:00' })
  startTime!: string | null;

  @ApiProperty({ nullable: true, example: '12:00:00' })
  endTime!: string | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({
    type: ExamTestSettingsResponseDto,
    nullable: true,
    description: 'Null when this test has no settings row.',
  })
  settings!: ExamTestSettingsResponseDto | null;
}

export class ExamDetailsResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Exam details fetched successfully' })
  message!: string;

  @ApiProperty({ type: ExamDetailsDataDto })
  data!: ExamDetailsDataDto;
}
