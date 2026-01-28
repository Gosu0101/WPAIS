import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { NotificationType, NotificationThresholds, DEFAULT_THRESHOLDS } from '../types';

@Entity('notification_settings')
@Index(['projectId', 'userId'])
@Unique(['projectId', 'userId'])
export class NotificationSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  projectId: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column('simple-json', { default: JSON.stringify(Object.values(NotificationType)) })
  enabledTypes: NotificationType[];

  @Column('simple-json', { default: JSON.stringify(DEFAULT_THRESHOLDS) })
  thresholds: NotificationThresholds;

  @UpdateDateColumn()
  updatedAt: Date;
}
