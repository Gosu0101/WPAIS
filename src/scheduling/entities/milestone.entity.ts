import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';

export enum MilestoneType {
  PLANNING_COMPLETE = 'PLANNING_COMPLETE',
  HIRING_COMPLETE = 'HIRING_COMPLETE',
  PRODUCTION_START = 'PRODUCTION_START',
  EPISODE_3_COMPLETE = 'EPISODE_3_COMPLETE',
  EPISODE_5_COMPLETE = 'EPISODE_5_COMPLETE',
  EPISODE_7_SEAL = 'EPISODE_7_SEAL',
  LAUNCH = 'LAUNCH',
}

@Entity('milestones')
export class Milestone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @ManyToOne(() => Project, (project) => project.milestones)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  name: string;

  @Column({
    type: 'varchar',
  })
  type: MilestoneType;

  @Column({ type: 'datetime' })
  targetDate: Date;

  @Column({ default: false })
  isCompleted: boolean;

  @Column({ type: 'datetime', nullable: true })
  completedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
