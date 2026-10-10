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
import { Subject } from '../../subjects/entities/subject.entity';
import { Test } from '../../tests/entities/test.entity';
import { Topic } from '../../topics/entities/topic.entity';
import { QuestionType } from '../enums/question.enum';

@Entity('questions')
@Index('IDX_questions_company_id_test_id', ['companyId', 'testId'])
@Index('IDX_questions_parent_question_id', ['parentQuestionId'])
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Exclude()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'test_id', type: 'uuid' })
  testId!: string;

  @ManyToOne(() => Test, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'test_id' })
  test!: Test;

  @Column({ name: 'subject_id', type: 'uuid' })
  subjectId!: string;

  @ManyToOne(() => Subject, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'subject_id' })
  subject!: Subject;

  @Column({ name: 'topic_id', type: 'uuid' })
  topicId!: string;

  @ManyToOne(() => Topic, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'topic_id' })
  topic!: Topic;

  @Column({ name: 'parent_question_id', type: 'uuid', nullable: true })
  parentQuestionId!: string | null;

  @Exclude()
  @ManyToOne(() => Question, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'parent_question_id' })
  parentQuestion!: Question | null;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;

  @Column({
    name: 'question_type',
    type: 'enum',
    enum: QuestionType,
  })
  questionType!: QuestionType;

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
