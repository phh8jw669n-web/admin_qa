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
import { Candidate } from '../../candidates/entities/candidate.entity';
import { Company } from '../../companies/entities/company.entity';
import { Group } from '../../groups/entities/group.entity';
import { Test } from '../../tests/entities/test.entity';
import { TestCandidateMappingStatus } from '../enums/test-candidate-mapping.enum';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value == null ? value : Number(value)),
};

@Entity('test_candidate_mappings')
@Index(
  'UQ_test_candidate_mappings_company_test_candidate_attempt',
  ['companyId', 'testId', 'candidateId', 'attemptNo'],
  { unique: true, where: '"deleted_at" IS NULL' },
)
export class TestCandidateMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Exclude()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'group_id', type: 'uuid' })
  groupId!: string;

  @ManyToOne(() => Group, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'group_id' })
  group!: Group;

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId!: string;

  @ManyToOne(() => Candidate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: Candidate;

  @Column({ name: 'test_id', type: 'uuid' })
  testId!: string;

  @ManyToOne(() => Test, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'test_id' })
  test!: Test;

  @Column({ name: 'attempt_no', type: 'int', default: 1 })
  attemptNo!: number;

  @Column({
    type: 'enum',
    enum: TestCandidateMappingStatus,
    default: TestCandidateMappingStatus.NOT_STARTED,
  })
  status!: TestCandidateMappingStatus;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'attempted_questions', type: 'int', default: 0 })
  attemptedQuestions!: number;

  @Column({ name: 'correct_answers', type: 'int', default: 0 })
  correctAnswers!: number;

  @Column({ name: 'wrong_answers', type: 'int', default: 0 })
  wrongAnswers!: number;

  @Column({ type: 'float', default: 0 })
  score!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  percentage!: number;

  @Column({ type: 'int', default: 0 })
  rank!: number;

  @Column({
    type: 'decimal',
    precision: 5,
    scale: 2,
    default: 0,
    transformer: decimalTransformer,
  })
  result!: number;

  @Column({ name: 'time_taken_seconds', type: 'int', default: 0 })
  timeTakenSeconds!: number;

  @Column({ name: 'ip_address', type: 'inet', nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
