import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SnapshotMetrics } from '../types';

@Entity('progress_snapshots')
@Index(['projectId', 'snapshotDate'])
export class ProgressSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  projectId: string;

  @Column('date')
  snapshotDate: Date;

  @Column('jsonb')
  metrics: SnapshotMetrics;

  @Column('decimal', { precision: 5, scale: 2 })
  healthScore: number;

  @CreateDateColumn()
  createdAt: Date;
}
