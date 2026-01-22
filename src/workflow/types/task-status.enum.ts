/**
 * 작업 상태
 * LOCKED → READY → IN_PROGRESS → DONE 순서로 전이
 */
export enum TaskStatus {
  /** 잠금 상태 - 선행 작업 완료 전까지 시작 불가 */
  LOCKED = 'LOCKED',
  /** 준비 상태 - 작업 시작 가능 */
  READY = 'READY',
  /** 진행 중 - 작업자가 작업 수행 중 */
  IN_PROGRESS = 'IN_PROGRESS',
  /** 완료 - 작업 완료됨 */
  DONE = 'DONE',
}

/**
 * 유효한 상태 전이 정의
 * - LOCKED → READY: 워크플로우 엔진에 의해서만 가능
 * - READY → IN_PROGRESS: 사용자가 작업 시작
 * - IN_PROGRESS → DONE: 사용자가 작업 완료
 */
export const VALID_TRANSITIONS: Map<TaskStatus, TaskStatus[]> = new Map([
  [TaskStatus.LOCKED, [TaskStatus.READY]],
  [TaskStatus.READY, [TaskStatus.IN_PROGRESS]],
  [TaskStatus.IN_PROGRESS, [TaskStatus.DONE]],
  [TaskStatus.DONE, []],
]);

/**
 * 상태 전이가 유효한지 검증
 */
export function isValidTransition(
  from: TaskStatus,
  to: TaskStatus,
): boolean {
  const validTargets = VALID_TRANSITIONS.get(from);
  return validTargets?.includes(to) ?? false;
}
