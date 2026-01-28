import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { MemberRole } from '../types';
import { TaskType } from '../../workflow/types';

@Entity('project_members')
@Index(['projectId', 'userId'])
@Unique(['projectId', 'userId', 'taskType'])
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  @Index()
  projectId: string;

  @Column('uuid')
  @Index()
  userId: string;

  @Column({ type: 'varchar' })
  role: MemberRole;

  @Column({ type: 'varchar', nullable: true })
  taskType: TaskType | null;

  @CreateDateColumn()
  createdAt: Date;
}
