import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskStatus } from '../types';
import { Episode } from '../../scheduling/entities/episode.entity';

/**
 * Page 엔티티
 * 웹툰 제작의 최소 작업 단위 (20,000px 규격)
 * 각 Page는 4개의 공정(배경, 선화, 채색, 후보정) 상태를 관리
 */
@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  episodeId: string;

  @ManyToOne(() => Episode)
  @JoinColumn({ name: 'episodeId' })
  episode: Episode;

  @Column('int')
  pageNumber: number; // 1-5

  @Column('int', { default: 20000 })
  heightPx: number;

  @Column({
    type: 'varchar',
    default: TaskStatus.READY,
  })
  backgroundStatus: TaskStatus;

  @Column({
    type: 'varchar',
    default: TaskStatus.LOCKED,
  })
  lineArtStatus: TaskStatus;

  @Column({
    type: 'varchar',
    default: TaskStatus.LOCKED,
  })
  coloringStatus: TaskStatus;

  @Column({
    type: 'varchar',
    default: TaskStatus.LOCKED,
  })
  postProcessingStatus: TaskStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
