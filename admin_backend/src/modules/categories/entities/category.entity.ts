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
import { Language } from '../../languages/entities/language.entity';

@Entity('categories')
@Index(
  'UQ_categories_company_id_name_language_id',
  ['companyId', 'name', 'languageId'],
  {
    unique: true,
    where: '"deleted_at" IS NULL AND "language_id" IS NOT NULL',
  },
)
@Index(
  'UQ_categories_company_id_name_no_language',
  ['companyId', 'name'],
  {
    unique: true,
    where: '"deleted_at" IS NULL AND "language_id" IS NULL',
  },
)
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Exclude()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'varchar', length: 250 })
  name!: string;

  @Column({ type: 'int' })
  ranking!: number;

  @Column({ name: 'language_id', type: 'uuid', nullable: true })
  languageId!: string | null;

  @ManyToOne(() => Language, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'language_id' })
  language!: Language | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
