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
import { Company } from '../../companies/entities/company.entity';
import { Difficulty } from '../../difficulties/entities/difficulty.entity';
import { Language } from '../../languages/entities/language.entity';
import { QuestionType } from '../enums/question.enum';
import { Question } from './question.entity';

const decimalTransformer = {
  to: (value: number | null) => value,
  from: (value: string | null) => (value == null ? value : Number(value)),
};

@Entity('question_content')
@Index(
  'UQ_question_content_question_id_language_id',
  ['questionId', 'languageId'],
  { unique: true, where: '"deleted_at" IS NULL' },
)
export class QuestionContent {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Exclude()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'question_id', type: 'uuid' })
  questionId!: string;

  @Exclude()
  @ManyToOne(() => Question, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'question_id' })
  question!: Question;

  @Column({ name: 'language_id', type: 'uuid' })
  languageId!: string;

  @ManyToOne(() => Language, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'language_id' })
  language!: Language;

  @Column({ name: 'difficulty_id', type: 'uuid' })
  difficultyId!: string;

  @ManyToOne(() => Difficulty, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'difficulty_id' })
  difficulty!: Difficulty;

  @Column({ name: 'question_text', type: 'text', nullable: true })
  questionText!: string | null;

  @Column({ type: 'json', nullable: true })
  options!: Record<string, unknown> | unknown[] | null;

  @Column({
    name: 'question_type',
    type: 'enum',
    enum: QuestionType,
    nullable: true,
  })
  questionType!: QuestionType | null;

  @Column({ type: 'text', nullable: true })
  explanation!: string | null;

  @Column({ name: 'solution_url', type: 'text', nullable: true })
  solutionUrl!: string | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  tags!: string | null;

  @Column({ name: 'option_marks', type: 'text', nullable: true })
  optionMarks!: string | null;

  @Column({
    name: 'range_from',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  rangeFrom!: number | null;

  @Column({
    name: 'range_to',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  rangeTo!: number | null;

  @Column({
    name: 'right_marks',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  rightMarks!: number | null;

  @Column({
    name: 'negative_marks',
    type: 'decimal',
    precision: 10,
    scale: 2,
    nullable: true,
    transformer: decimalTransformer,
  })
  negativeMarks!: number | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
