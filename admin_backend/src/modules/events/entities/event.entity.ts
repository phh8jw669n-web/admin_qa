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
import { ExamType, EventType } from '../enums/event.enum';

@Entity('events')
@Index('UQ_events_company_id_event_code', ['companyId', 'eventCode'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
export class Event {
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

  @Column({ name: 'event_code', type: 'varchar', length: 50 })
  eventCode!: string;

  @Column({
    name: 'exam_type',
    type: 'enum',
    enum: ExamType,
  })
  examType!: ExamType;

  @Column({
    name: 'event_type',
    type: 'enum',
    enum: EventType,
  })
  eventType!: EventType;

  @Column({ name: 'event_opening_at', type: 'timestamp' })
  eventOpeningAt!: Date;

  @Column({ name: 'event_closing_at', type: 'timestamp' })
  eventClosingAt!: Date;

  @Column({ name: 'instruction_at', type: 'timestamp', nullable: true })
  instructionAt!: Date | null;

  @Column({ name: 'password_instruction', type: 'text', nullable: true })
  passwordInstruction!: string | null;

  @Column({ name: 'is_publish', type: 'boolean', default: false })
  isPublish!: boolean;

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
