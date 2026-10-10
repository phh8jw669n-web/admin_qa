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
import { Subject } from '../../subjects/entities/subject.entity';
import { Topic } from '../../topics/entities/topic.entity';

@Entity('category_subject_topic_mappings')
@Index(
  'UQ_cst_mappings_company_category_subject_topic',
  ['companyId', 'categoryId', 'subjectId', 'topicId'],
  { unique: true, where: '"deleted_at" IS NULL' },
)
export class CategorySubjectTopicMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Exclude()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'category_id', type: 'uuid' })
  categoryId!: string;

  @ManyToOne(() => Category, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category!: Category;

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

  @Column({ type: 'int' })
  ranking!: number;

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
