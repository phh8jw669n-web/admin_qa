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
import { Category } from '../../categories/entities/category.entity';
import { Company } from '../../companies/entities/company.entity';
import { Instruction } from '../../instructions/entities/instruction.entity';
import { Template } from '../../templates/entities/template.entity';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value == null ? value : Number(value)),
};

@Entity('tests')
@Index('UQ_tests_company_id_test_code', ['companyId', 'testCode'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Test {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Exclude()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'test_code', type: 'varchar', length: 10 })
  testCode!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

  @Column({ name: 'primary_instruction_id', type: 'uuid' })
  primaryInstructionId!: string;

  @ManyToOne(() => Instruction, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'primary_instruction_id' })
  primaryInstruction!: Instruction;

  @Column({ name: 'duration_minutes', type: 'int' })
  durationMinutes!: number;

  @Column({ name: 'handicapped_duration_minutes', type: 'int' })
  handicappedDurationMinutes!: number;

  @Column({ name: 'total_questions', type: 'int' })
  totalQuestions!: number;

  @Column({
    name: 'total_marks',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  totalMarks!: number;

  @Column({
    name: 'passing_marks',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  passingMarks!: number;

  @Column({
    name: 'grace_marks',
    type: 'decimal',
    precision: 10,
    scale: 2,
    transformer: decimalTransformer,
  })
  graceMarks!: number;

  @Column({ name: 'is_draft', type: 'boolean', default: true })
  isDraft!: boolean;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string;

  @ManyToOne(() => Template, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'template_id' })
  template!: Template;

  @Column({ name: 'is_published', type: 'boolean', default: true })
  isPublished!: boolean;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ name: 'start_buffer_time', type: 'time', nullable: true })
  startBufferTime!: string | null;

  @Column({ name: 'start_time', type: 'time', nullable: true })
  startTime!: string | null;

  @Column({ name: 'end_time', type: 'time', nullable: true })
  endTime!: string | null;

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
