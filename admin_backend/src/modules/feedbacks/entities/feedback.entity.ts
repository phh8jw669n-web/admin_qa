import { Exclude } from 'class-transformer';
import {
  Check,
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
import { Test } from '../../tests/entities/test.entity';

@Entity('feedbacks')
@Index(
  'UQ_feedbacks_company_id_student_id_test_id',
  ['companyId', 'studentId', 'testId'],
  { unique: true, where: '"deleted_at" IS NULL' },
)
@Check('CHK_feedbacks_rating', '"rating" BETWEEN 1 AND 5')
export class Feedback {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'student_id', type: 'uuid' })
  studentId!: string;

  @Exclude()
  @ManyToOne(() => Candidate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'student_id' })
  student!: Candidate;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'test_id', type: 'uuid' })
  testId!: string;

  @Exclude()
  @ManyToOne(() => Test, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'test_id' })
  test!: Test;

  @Column({ type: 'smallint' })
  rating!: number;

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
