import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';

export enum EpisodeStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

@Entity('episodes')
export class Episode {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  projectId: string;

  @ManyToOne(() => Project, (project) => project.episodes)
  @JoinColumn({ name: 'projectId' })
  project: Project;

  @Column()
  episodeNumber: number;

  @Column({ type: 'datetime' })
  dueDate: Date;

  @Column()
  duration: number;

  @Column({
    type: 'varchar',
    default: EpisodeStatus.PENDING,
  })
  status: EpisodeStatus;

  @Column({ default: false })
  isSealed: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
