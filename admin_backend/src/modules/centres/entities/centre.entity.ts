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
import { Region } from '../../regions/entities/region.entity';
import { Zone } from '../../zones/entities/zone.entity';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value == null ? value : Number(value)),
};

@Entity('centres')
@Index('UQ_centres_company_id_code', ['companyId', 'code'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Index(
  'UQ_centres_company_id_region_id_name',
  ['companyId', 'regionId', 'name'],
  {
    unique: true,
    where: '"deleted_at" IS NULL',
  },
)
export class Centre {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Exclude()
  @Column({ name: 'company_id', type: 'uuid' })
  companyId!: string;

  @Exclude()
  @ManyToOne(() => Company, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'company_id' })
  company!: Company;

  @Column({ name: 'zone_id', type: 'uuid' })
  zoneId!: string;

  @ManyToOne(() => Zone, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'zone_id' })
  zone!: Zone;

  @Column({ name: 'region_id', type: 'uuid' })
  regionId!: string;

  @ManyToOne(() => Region, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'region_id' })
  region!: Region;

  @Column({ type: 'varchar', length: 250 })
  name!: string;

  @Column({ type: 'varchar', length: 50 })
  code!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ type: 'text', nullable: true })
  landmark!: string | null;

  @Column({ name: 'co_ordinator_name', type: 'varchar', length: 250 })
  coordinatorName!: string;

  @Column({ name: 'co_ordinator_email', type: 'varchar', length: 255 })
  coordinatorEmail!: string;

  @Column({ name: 'primary_phone_no', type: 'varchar', length: 20 })
  primaryPhoneNo!: string;

  @Column({
    name: 'secondary_phone_no',
    type: 'varchar',
    length: 20,
    nullable: true,
  })
  secondaryPhoneNo!: string | null;

  @Column({ name: 'lab_count', type: 'int' })
  labCount!: number;

  @Column({ name: 'session_count', type: 'int' })
  sessionCount!: number;

  @Column({ type: 'int' })
  seats!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    transformer: decimalTransformer,
  })
  latitude!: number;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 7,
    transformer: decimalTransformer,
  })
  longitude!: number;

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
