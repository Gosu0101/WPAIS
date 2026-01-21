import { EpisodeSchedule } from './episode-schedule.type';
import { MilestoneType } from '../entities';

/**
 * MilestoneSchedule - 마일스톤 스케줄 정보
 */
export interface MilestoneSchedule {
  /** 마일스톤 이름 */
  name: string;
  
  /** 마일스톤 유형 */
  type: MilestoneType;
  
  /** 목표 날짜 */
  targetDate: Date;
}

/**
 * MasterSchedule - 전체 마스터 스케줄 정보
 * 
 * 런칭일을 기준으로 역산하여 계산된 전체 제작 일정을 포함합니다.
 */
export interface MasterSchedule {
  /** 런칭 목표일 */
  launchDate: Date;
  
  /** 봉인일 (런칭일 - 30일) */
  sealDate: Date;
  
  /** 제작 시작일 */
  productionStartDate: Date;
  
  /** 채용 시작일 */
  hiringStartDate: Date;
  
  /** 기획 시작일 */
  planningStartDate: Date;
  
  /** 전체 제작 기간 (일 단위) */
  totalProductionDays: number;
  
  /** 회차별 스케줄 */
  episodes: EpisodeSchedule[];
  
  /** 마일스톤 목록 */
  milestones: MilestoneSchedule[];
}
