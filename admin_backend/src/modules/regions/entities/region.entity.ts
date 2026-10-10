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
import { Zone } from '../../zones/entities/zone.entity';

const decimalTransformer = {
  to: (value: number) => value,
  from: (value: string | null) => (value == null ? value : Number(value)),
};

@Entity('regions')
@Index('UQ_regions_company_id_zone_id_name', ['companyId', 'zoneId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Region {
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

  @Column({ type: 'varchar', length: 250 })
  name!: string;

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

  @Column({ name: 'state_name', type: 'varchar', length: 250 })
  stateName!: string;

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
