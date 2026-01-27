import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { AlertType, AlertSeverity } from '../types';

@Entity('alerts')
@Index(['projectId', 'createdAt'])
export class Alert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  projectId: string;

  @Column({
    type: 'varchar',
  })
  alertType: AlertType;

  @Column({
    type: 'varchar',
  })
  severity: AlertSeverity;

  @Column('text')
  message: string;

  @Column('simple-json', { nullable: true })
  metadata?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ nullable: true })
  acknowledgedAt?: Date;
}
