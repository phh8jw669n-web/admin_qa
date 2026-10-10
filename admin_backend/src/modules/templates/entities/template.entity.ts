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

@Entity('templates')
@Index('UQ_templates_ranking', ['ranking'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'image_key', type: 'varchar', length: 100 })
  imageKey!: string;

  @Column({ name: 'html_key', type: 'varchar', length: 100 })
  htmlKey!: string;

  @Column({ type: 'varchar', length: 200 })
  name!: string;

  @Column({ type: 'int' })
  ranking!: number;

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
