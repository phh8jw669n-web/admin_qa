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
import { Candidate } from '../../entities/candidate.entity';
import { CandidateDocumentType } from '../enums/document-type.enum';

@Entity('candidate_documents')
@Index(
  'UQ_candidate_documents_candidate_id_document_type',
  ['candidateId', 'documentType'],
  {
    unique: true,
    where: '"deleted_at" IS NULL AND "document_type" IS NOT NULL',
  },
)
export class CandidateDocument {
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

  @Exclude()
  @ManyToOne(() => Candidate, (candidate) => candidate.documents, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'candidate_id' })
  candidate!: Candidate;

  @Column({ name: 'file_url', type: 'varchar', length: 500, nullable: true })
  fileUrl!: string | null;

  @Column({
    name: 'document_type',
    type: 'enum',
    enum: CandidateDocumentType,
    nullable: true,
  })
  documentType!: CandidateDocumentType | null;

  @Column({
    name: 'document_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  documentName!: string | null;

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
