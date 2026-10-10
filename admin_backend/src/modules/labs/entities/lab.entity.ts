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
import { Centre } from '../../centres/entities/centre.entity';
import { Region } from '../../regions/entities/region.entity';
import { Zone } from '../../zones/entities/zone.entity';

@Entity('labs')
@Index('UQ_labs_company_id_centre_id_name', ['companyId', 'centreId', 'name'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Lab {
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

  @Column({ name: 'centre_id', type: 'uuid' })
  centreId!: string;

  @ManyToOne(() => Centre, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'centre_id' })
  centre!: Centre;

  @Column({ type: 'varchar', length: 250 })
  name!: string;

  @Column({ name: 'session_count', type: 'int' })
  sessionCount!: number;

  @Column({ type: 'int' })
  seats!: number;

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
