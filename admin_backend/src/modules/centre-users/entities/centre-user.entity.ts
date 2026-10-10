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
import { Centre } from '../../centres/entities/centre.entity';
import { Company } from '../../companies/entities/company.entity';

@Entity('centre_users')
@Index('UQ_centre_users_company_id_email', ['companyId', 'email'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class CentreUser {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'centre_id', type: 'uuid' })
  centreId!: string;

  @ManyToOne(() => Centre, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'centre_id' })
  centre!: Centre;

  @Column({ type: 'varchar', length: 250, nullable: true })
  name!: string | null;

  @Column({ type: 'varchar', length: 250, nullable: true })
  email!: string | null;

  @Exclude()
  @Column({
    name: 'password',
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

  @Column({
    name: 'enable_mail',
    type: 'boolean',
    default: false,
  })
  enableMail!: boolean;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @Exclude()
  @DeleteDateColumn({ name: 'deleted_at' })
  deletedAt!: Date | null;
}
