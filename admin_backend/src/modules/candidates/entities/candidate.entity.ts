import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Group } from '../../groups/entities/group.entity';
import {
  CandidateGender,
  MediumOfExam,
  PaymentStatus,
} from '../enums/candidate.enum';
import { CandidateDocument } from '../documents/entities/document.entity';

@Entity('candidates')
@Index('UQ_candidates_company_id_email', ['companyId', 'email'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index(
  'UQ_candidates_company_id_enrollment_number',
  ['companyId', 'enrollmentNumber'],
  { unique: true, where: '"deleted_at" IS NULL' },
)
export class Candidate {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Exclude()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Exclude()
  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash!: string;

  @Column({ name: 'enrollment_number', type: 'varchar', length: 100 })
  enrollmentNumber!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 20 })
  mobile!: string;

  @Column({
    name: 'secondary_mobile',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  secondaryMobile!: string | null;

  @Column({
    type: 'enum',
    enum: CandidateGender,
    default: CandidateGender.MALE,
  })
  gender!: CandidateGender;

  @Column({ name: 'has_disability', type: 'boolean', default: false })
  hasDisability!: boolean;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: string | null;

  @Column({ name: 'date_of_registration', type: 'timestamp' })
  dateOfRegistration!: Date;

  @Column({
    name: 'parent_name',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  parentName!: string | null;

  @Column({
    name: 'parent_email',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  parentEmail!: string | null;

  @Column({
    name: 'parent_mobile',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  parentMobile!: string | null;

  @Column({ type: 'varchar', length: 100 })
  country!: string;

  @Column({ name: 'is_mail_enabled', type: 'boolean', default: false })
  isMailEnabled!: boolean;

  @Column({ type: 'varchar', length: 100 })
  state!: string;

  @Column({ type: 'varchar', length: 100 })
  city!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'varchar', length: 20 })
  pincode!: string;

  @Column({ name: 'class', type: 'varchar', length: 255, nullable: true })
  className!: string | null;

  @Column({
    name: 'medium_of_exam',
    type: 'enum',
    enum: MediumOfExam,
    nullable: true,
  })
  mediumOfExam!: MediumOfExam | null;

  @Column({ name: 'preferred_location', type: 'text', nullable: true })
  preferredLocation!: string | null;

  @Column({ name: 'extra_1', type: 'text', nullable: true })
  extra1!: string | null;

  @Column({ name: 'extra_2', type: 'text', nullable: true })
  extra2!: string | null;

  @Column({ name: 'extra_3', type: 'text', nullable: true })
  extra3!: string | null;

  @Column({ name: 'extra_4', type: 'text', nullable: true })
  extra4!: string | null;

  @OneToMany(() => CandidateDocument, (document) => document.candidate)
  documents!: CandidateDocument[];

  @Column({ name: 'group_ids', type: 'uuid', array: true })
  groupIds!: string[];

  @Exclude()
  @ManyToMany(() => Group, (group) => group.candidates, { onDelete: 'RESTRICT' })
  @JoinTable({
    name: 'candidate_groups',
    joinColumn: { name: 'candidate_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'group_id', referencedColumnName: 'id' },
  })
  groups!: Group[];

  @Column({ name: 'is_enroll', type: 'boolean', default: false })
  isEnroll!: boolean;

  @Column({
    name: 'payment_status',
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  paymentStatus!: PaymentStatus;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Exclude()
  @Column({
    name: 'refresh_token_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  refreshTokenHash!: string | null;

  @Exclude()
  @Column({
    name: 'token_version',
    type: 'int',
    default: 0,
  })
  tokenVersion!: number;

  @Column({ name: 'exam_centre_id', type: 'uuid', nullable: true })
  examCentreId!: string | null;

  @Column({ name: 'exam_date', type: 'date', nullable: true })
  examDate!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
