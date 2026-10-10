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
import { AdminRole } from '../enums/admin-role.enum';

@Entity('admins')
@Index('UQ_admins_company_id_email', ['companyId', 'email'], {
  unique: true,
  where: '"deleted_at" IS NULL AND "company_id" IS NOT NULL',
})
@Index('UQ_admins_email_super_admin', ['email'], {
  unique: true,
  where: '"deleted_at" IS NULL AND "company_id" IS NULL',
})
export class Admin {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Exclude()
  @Column({ name: 'company_id', type: 'uuid', nullable: true })
  companyId!: string | null;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT', nullable: true })
  @JoinColumn({ name: 'company_id' })
  company!: Company | null;

  @Column({
    name: 'first_name',
    type: 'varchar',
    length: 100,
  })
  firstName!: string;

  @Column({
    name: 'last_name',
    type: 'varchar',
    length: 100,
  })
  lastName!: string;

  @Column({
    type: 'enum',
    enum: AdminRole,
  })
  role!: AdminRole;

  @Column({
    name: 'is_mfa_enabled',
    type: 'boolean',
    default: true,
  })
  isMfaEnabled!: boolean;

  @Column({ type: 'varchar', length: 250 })
  email!: string;

  @Column({
    name: 'country_code',
    type: 'varchar',
    length: 5,
    default: '91',
  })
  countryCode!: string;

  @Column({
    name: 'mobile_number',
    type: 'varchar',
    length: 15,
    nullable: true,
  })
  mobileNumber!: string | null;

  @Exclude()
  @Column({
    name: 'password_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordHash!: string | null;

  @Column({
    name: 'is_active',
    type: 'boolean',
    default: true,
  })
  isActive!: boolean;

  @Column({ name: 'profile_image_url', type: 'text', nullable: true })
  profileImageUrl!: string | null;

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

  @Exclude()
  @Column({
    name: 'password_reset_token_hash',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  passwordResetTokenHash!: string | null;

  @Exclude()
  @Column({
    name: 'password_reset_expires_at',
    type: 'timestamptz',
    nullable: true,
  })
  passwordResetExpiresAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
