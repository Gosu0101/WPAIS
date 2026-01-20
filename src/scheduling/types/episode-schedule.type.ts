/**
 * EpisodeSchedule - 회차별 스케줄 정보
 * 
 * 각 회차의 시작일, 마감일, 제작 기간 등을 포함합니다.
 */
export interface EpisodeSchedule {
  /** 회차 번호 (1, 2, 3, ...) */
  episodeNumber: number;
  
  /** 제작 시작일 */
  startDate: Date;
  
  /** 마감일 */
  dueDate: Date;
  
  /** 제작 기간 (일 단위) */
  duration: number;
  
  /** 적응기 여부 */
  isLearningPeriod: boolean;
}
