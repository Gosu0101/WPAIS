import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Episode } from './episode.entity';
import { Milestone } from './milestone.entity';
import { VelocityConfig } from '../types/velocity-config.type';

@Entity('projects')
export class Project {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Index('idx_project_launch_date')
  @Column()
  launchDate: Date;

  @Column()
  sealDate: Date;

  @Column()
  productionStartDate: Date;

  @Column()
  hiringStartDate: Date;

  @Column()
  planningStartDate: Date;

  @Column('simple-json')
  velocityConfig: VelocityConfig;

  @OneToMany(() => Episode, (episode) => episode.project)
  episodes: Episode[];

  @OneToMany(() => Milestone, (milestone) => milestone.project)
  milestones: Milestone[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
