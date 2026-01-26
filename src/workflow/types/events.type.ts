import { TaskType } from './task-type.enum';

/**
 * 작업 잠금 해제 이벤트
 * 작업 상태가 READY로 변경될 때 발행됨
 */
export interface TaskUnlockedEvent {
  pageId: string;
  taskType: TaskType;
  timestamp: Date;
}

/**
 * 에피소드 완료 이벤트
 * 에피소드의 모든 작업(20개)이 완료될 때 발행됨
 */
export interface EpisodeCompletedEvent {
  episodeId: string;
  completedAt: Date;
}

/**
 * TaskType별 진행률 정보
 */
export interface TaskTypeProgress {
  total: number;
  completed: number;
  percentage: number;
}

/**
 * 에피소드 진행률 정보
 * 전체 진행률과 TaskType별 breakdown 포함
 */
export interface EpisodeProgress {
  episodeId: string;
  totalTasks: number;        // 20 (5 pages × 4 stages)
  completedTasks: number;
  percentage: number;
  byTaskType: {
    [key in TaskType]: TaskTypeProgress;
  };
}

/**
 * 이벤트 이름 상수
 */
export const WORKFLOW_EVENTS = {
  TASK_UNLOCKED: 'workflow.task.unlocked',
  EPISODE_COMPLETED: 'workflow.episode.completed',
} as const;
