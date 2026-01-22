import { TaskType } from '../types';

/**
 * 스테이지 퍼스트 의존성 미충족 시 발생하는 에러
 * 선행 작업이 완료되지 않은 상태에서 후속 작업을 시작하려 할 때 발생
 * 
 * Requirements: 3.1
 */
export class LockedException extends Error {
  constructor(
    public readonly pageId: string,
    public readonly taskType: TaskType,
    public readonly requiredPredecessor: TaskType,
  ) {
    super(
      `Task ${taskType} is locked. ${requiredPredecessor} must be DONE first.`,
    );
    this.name = 'LockedException';
  }
}
