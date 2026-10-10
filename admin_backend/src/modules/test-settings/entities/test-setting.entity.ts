import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Test } from '../../tests/entities/test.entity';
import {
  ClockFormat,
  SectionQuestionNumbering,
} from '../enums/test-setting.enum';

@Entity('test_settings')
@Index('UQ_test_settings_test_id', ['testId'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class TestSetting {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'test_id', type: 'uuid' })
  testId!: string;

  @ManyToOne(() => Test, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'test_id' })
  test!: Test;

  @Column({
    name: 'group_questions_by_subject_area',
    type: 'boolean',
    default: false,
  })
  groupQuestionsBySubjectArea!: boolean;

  @Column({
    name: 'group_questions_by_topic',
    type: 'boolean',
    default: false,
  })
  groupQuestionsByTopic!: boolean;

  @Column({
    name: 'section_question_numbering',
    type: 'enum',
    enum: SectionQuestionNumbering,
    default: SectionQuestionNumbering.CONTINUOUS,
  })
  sectionQuestionNumbering!: SectionQuestionNumbering;

  @Column({
    name: 'randomize_question_order_within_topics',
    type: 'boolean',
    default: false,
  })
  randomizeQuestionOrderWithinTopics!: boolean;

  @Column({
    name: 'randomize_answer_options',
    type: 'boolean',
    default: false,
  })
  randomizeAnswerOptions!: boolean;

  @Column({
    name: 'is_all_questions_mandatory',
    type: 'boolean',
    default: false,
  })
  isAllQuestionsMandatory!: boolean;

  @Column({
    name: 'show_correct_answer_after_attempt',
    type: 'boolean',
    default: false,
  })
  showCorrectAnswerAfterAttempt!: boolean;

  @Column({
    name: 'enable_partial_credit',
    type: 'boolean',
    default: false,
  })
  enablePartialCredit!: boolean;

  @Column({
    name: 'enable_generic_plugin',
    type: 'boolean',
    default: false,
  })
  enableGenericPlugin!: boolean;

  @Column({ name: 'show_internet_speed', type: 'boolean', default: false })
  showInternetSpeed!: boolean;

  @Column({
    name: 'enable_partial_marking',
    type: 'boolean',
    default: false,
  })
  enablePartialMarking!: boolean;

  @Column({
    name: 'enable_scientific_calculator',
    type: 'boolean',
    default: false,
  })
  enableScientificCalculator!: boolean;

  @Column({ name: 'enable_activity_log', type: 'boolean', default: false })
  enableActivityLog!: boolean;

  @Column({
    name: 'show_incorrect_words_typed',
    type: 'boolean',
    default: false,
  })
  showIncorrectWordsTyped!: boolean;

  @Column({ name: 'enable_backspace', type: 'boolean', default: false })
  enableBackspace!: boolean;

  @Column({
    name: 'allow_question_navigation',
    type: 'boolean',
    default: true,
  })
  allowQuestionNavigation!: boolean;

  @Column({ name: 'show_marks_during_test', type: 'boolean', default: true })
  showMarksDuringTest!: boolean;

  @Column({
    name: 'enable_multiple_languages',
    type: 'boolean',
    default: false,
  })
  enableMultipleLanguages!: boolean;

  @Column({
    name: 'show_question_in_single_line',
    type: 'boolean',
    default: false,
  })
  showQuestionInSingleLine!: boolean;

  @Column({
    name: 'show_default_calculator',
    type: 'boolean',
    default: false,
  })
  showDefaultCalculator!: boolean;

  @Column({ name: 'enable_offline_mode', type: 'boolean', default: false })
  enableOfflineMode!: boolean;

  @Column({ name: 'enable_secure_browser', type: 'boolean', default: true })
  enableSecureBrowser!: boolean;

  @Column({ name: 'is_test_time_bound', type: 'boolean', default: true })
  isTestTimeBound!: boolean;

  @Column({
    name: 'clock_format',
    type: 'enum',
    enum: ClockFormat,
    default: ClockFormat.MM_SS,
  })
  clockFormat!: ClockFormat;

  @Column({ name: 'enable_sections', type: 'boolean', default: false })
  enableSections!: boolean;

  @Column({
    name: 'show_personalized_message',
    type: 'boolean',
    default: true,
  })
  showPersonalizedMessage!: boolean;

  @Column({ name: 'pass_feedback_message', type: 'text', nullable: true })
  passFeedbackMessage!: string | null;

  @Column({ name: 'fail_feedback_message', type: 'text', nullable: true })
  failFeedbackMessage!: string | null;

  @Column({ name: 'submission_message', type: 'text', nullable: true })
  submissionMessage!: string | null;

  @Column({
    name: 'enable_candidate_feedback',
    type: 'boolean',
    default: false,
  })
  enableCandidateFeedback!: boolean;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
