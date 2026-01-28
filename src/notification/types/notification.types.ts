/**
 * 알림 유형
 */
export enum NotificationType {
  // 마감 임박
  TASK_DEADLINE_APPROACHING = 'TASK_DEADLINE_APPROACHING',
  EPISODE_DEADLINE_APPROACHING = 'EPISODE_DEADLINE_APPROACHING',
  MILESTONE_DEADLINE_APPROACHING = 'MILESTONE_DEADLINE_APPROACHING',

  // 작업 상태 변경
  TASK_STARTED = 'TASK_STARTED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  NEXT_TASK_READY = 'NEXT_TASK_READY',
  EPISODE_COMPLETED = 'EPISODE_COMPLETED',
}

/**
 * 프로젝트 멤버 역할
 */
export enum MemberRole {
  PD = 'PD',
  WORKER = 'WORKER',
}

/**
 * 알림 임계값 설정
 */
export interface NotificationThresholds {
  task: number[];
  episode: number[];
  milestone: number[];
}

/**
 * 기본 알림 임계값
 */
export const DEFAULT_THRESHOLDS: NotificationThresholds = {
  task: [3, 1, 0],
  episode: [7, 3, 1],
  milestone: [14, 7, 3, 1],
};

import { AlertSeverity } from '../../monitor/types';

/**
 * 알림 생성 입력
 */
export interface CreateNotificationInput {
  projectId: string;
  recipientId: string;
  notificationType: NotificationType;
  severity: AlertSeverity;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * 알림 필터 옵션
 */
export interface NotificationFilterOptions {
  projectId?: string;
  recipientId?: string;
  notificationType?: NotificationType;
  severity?: AlertSeverity;
  isRead?: boolean;
  startDate?: Date;
  endDate?: Date;
}
