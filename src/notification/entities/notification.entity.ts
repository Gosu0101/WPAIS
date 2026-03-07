import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { NotificationType } from '../types';
import { AlertSeverity } from '../../monitor/types';
import { DATETIME_COLUMN_TYPE } from '../../config/database-column-types';

@Entity('notifications')
@Index(['projectId', 'recipientId', 'createdAt'])
@Index(['recipientId', 'isRead'])
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  projectId: string;

  @Column('uuid')
  @Index()
  recipientId: string;

  @Column({ type: 'varchar' })
  notificationType: NotificationType;

  @Column({ type: 'varchar' })
  severity: AlertSeverity;

  @Column('text')
  title: string;

  @Column('text')
  message: string;

  @Column('simple-json', { nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: DATETIME_COLUMN_TYPE, nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
