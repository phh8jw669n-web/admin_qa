import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { CompanyPlan, CompanyStatus } from '../enums/company.enum';

@Entity('companies')
@Index('UQ_companies_workspace_url', ['workspaceUrl'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('UQ_companies_company_code', ['companyCode'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('UQ_companies_email', ['email'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index('UQ_companies_gst_no', ['gstNo'], {
  unique: true,
  where: '"deleted_at" IS NULL AND "gst_no" IS NOT NULL',
})
export class Company {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({
    name: 'workspace_url',
    type: 'varchar',
    length: 200,
  })
  workspaceUrl!: string;

  @Column({
    name: 'company_code',
    type: 'varchar',
    length: 50,
  })
  companyCode!: string;

  @Column({
    type: 'varchar',
    length: 100,
    nullable: true,
  })
  industry!: string | null;

  @Column({ name: 'year_founded', type: 'int', nullable: true })
  yearFounded!: number | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({
    name: 'address_line_1',
    type: 'varchar',
    length: 200,
  })
  addressLine1!: string;

  @Column({
    name: 'address_line_2',
    type: 'varchar',
    length: 200,
    nullable: true,
  })
  addressLine2!: string | null;

  @Column({
    name: 'pin_code',
    type: 'varchar',
    length: 20,
  })
  pinCode!: string;

  @Column({ type: 'varchar', length: 255 })
  city!: string;

  @Column({ type: 'varchar', length: 255 })
  state!: string;

  @Column({ type: 'varchar', length: 255 })
  country!: string;

  @Column({ type: 'varchar', length: 20 })
  phone!: string;

  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  fax!: string | null;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  website!: string | null;

  @Column({
    name: 'service_tax_no',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  serviceTaxNo!: string | null;

  @Column({
    name: 'pan_no',
    type: 'varchar',
    length: 10,
    nullable: true,
  })
  panNo!: string | null;

  @Column({
    name: 'vat_registration_no',
    type: 'varchar',
    length: 50,
    nullable: true,
  })
  vatRegistrationNo!: string | null;

  @Column({
    name: 'gst_no',
    type: 'varchar',
    length: 20,
  })
  gstNo!: string;

  @Column({ name: 'company_logo', type: 'text', nullable: true })
  companyLogo!: string | null;

  @Column({ type: 'text', nullable: true })
  favicon!: string | null;

  @Column({
    name: 'primary_color',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  primaryColor!: string | null;

  @Column({
    name: 'secondary_color',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  secondaryColor!: string | null;

  @Column({
    type: 'enum',
    enum: CompanyStatus,
    default: CompanyStatus.ACTIVE,
  })
  status!: CompanyStatus;

  @Column({
    type: 'enum',
    enum: CompanyPlan,
    default: CompanyPlan.TRIAL,
  })
  plan!: CompanyPlan;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @Column({ name: 'plan_ends_at', type: 'timestamptz', nullable: true })
  planEndsAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
