import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { TaskStatus } from '../types';
import { Episode } from '../../scheduling/entities/episode.entity';
import { DATETIME_COLUMN_TYPE } from '../../config/database-column-types';

/**
 * Page 엔티티
 * 웹툰 제작의 최소 작업 단위 (20,000px 규격)
 * 각 Page는 4개의 공정(배경, 선화, 채색, 후보정) 상태를 관리
 * 
 * 공정별 마감일 계산 로직:
 * - 에피소드 기간을 4개 공정에 균등 분배 (각 25%)
 * - 배경 → 선화 → 채색 → 후보정 순서로 순차 진행
 * - 예: 14일 에피소드 = 배경 3.5일 + 선화 3.5일 + 채색 3.5일 + 후보정 3.5일
 */
@Entity('pages')
export class Page {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index('idx_page_episode_id')
  @Column('uuid')
  episodeId: string;

  @ManyToOne(() => Episode)
  @JoinColumn({ name: 'episodeId' })
  episode: Episode;

  @Column('int')
  pageNumber: number; // 1-5

  @Column('int', { default: 20000 })
  heightPx: number;

  // 공정별 상태
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

  // 공정별 마감일 (에피소드 시작일 기준으로 계산)
  @Column({ type: DATETIME_COLUMN_TYPE, nullable: true })
  backgroundDueDate: Date | null;

  @Column({ type: DATETIME_COLUMN_TYPE, nullable: true })
  lineArtDueDate: Date | null;

  @Column({ type: DATETIME_COLUMN_TYPE, nullable: true })
  coloringDueDate: Date | null;

  @Column({ type: DATETIME_COLUMN_TYPE, nullable: true })
  postProcessingDueDate: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
