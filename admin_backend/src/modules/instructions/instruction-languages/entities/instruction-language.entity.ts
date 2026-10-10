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
import { Company } from '../../../companies/entities/company.entity';
import { Language } from '../../../languages/entities/language.entity';
import { Instruction } from '../../entities/instruction.entity';

@Entity('instruction_languages')
@Index(
  'UQ_instruction_languages_instruction_id_language_id',
  ['instructionId', 'languageId'],
  { unique: true, where: '"deleted_at" IS NULL' },
)
export class InstructionLanguage {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Exclude()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'instruction_id', type: 'uuid' })
  instructionId!: string;

  @Exclude()
  @ManyToOne(() => Instruction, (instruction) => instruction.instructionLanguages, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'instruction_id' })
  instruction!: Instruction;

  @Column({ name: 'language_id', type: 'uuid' })
  languageId!: string;

  @ManyToOne(() => Language, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'language_id' })
  language!: Language;

  @Column({ type: 'text' })
  content!: string;

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
