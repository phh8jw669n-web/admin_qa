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
import { Centre } from '../../centres/entities/centre.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity('candidate_centre_mappings')
@Index(
  'UQ_candidate_centre_mappings_company_candidate_centre_date',
  ['companyId', 'candidateId', 'centreId', 'examDate'],
  { unique: true, where: '"deleted_at" IS NULL' },
)
export class CandidateCentreMapping {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Exclude()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'candidate_id', type: 'uuid' })
  candidateId!: string;

  @ManyToOne(() => Candidate, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: Candidate;

  @Column({ name: 'centre_id', type: 'uuid' })
  centreId!: string;

  @ManyToOne(() => Centre, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'centre_id' })
  centre!: Centre;

  @Column({ name: 'exam_date', type: 'date' })
  examDate!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
