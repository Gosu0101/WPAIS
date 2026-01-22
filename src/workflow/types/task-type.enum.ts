/**
 * 웹툰 제작 공정 유형
 * 배경 → 선화 → 채색 → 후보정 순서의 의존성 체인을 형성
 */
export enum TaskType {
  /** 배경 작업 - 첫 번째 공정 */
  BACKGROUND = 'BACKGROUND',
  /** 선화 작업 - 배경 완료 후 시작 가능 */
  LINE_ART = 'LINE_ART',
  /** 채색 작업 - 선화 완료 후 시작 가능 */
  COLORING = 'COLORING',
  /** 후보정 작업 - 채색 완료 후 시작 가능 */
  POST_PROCESSING = 'POST_PROCESSING',
}

/**
 * TaskType 의존성 체인 정의
 * 각 TaskType의 선행 작업을 반환
 */
export const TASK_DEPENDENCY_CHAIN: Record<TaskType, TaskType | null> = {
  [TaskType.BACKGROUND]: null,
  [TaskType.LINE_ART]: TaskType.BACKGROUND,
  [TaskType.COLORING]: TaskType.LINE_ART,
  [TaskType.POST_PROCESSING]: TaskType.COLORING,
};

/**
 * TaskType 순서 배열 (의존성 순서대로)
 */
export const TASK_TYPE_ORDER: TaskType[] = [
  TaskType.BACKGROUND,
  TaskType.LINE_ART,
  TaskType.COLORING,
  TaskType.POST_PROCESSING,
];
