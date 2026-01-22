import { TaskStatus } from '../types';

/**
 * 유효하지 않은 상태 전이 시 발생하는 에러
 * Requirements: 6.1, 6.2
 */
export class InvalidStateTransitionError extends Error {
  constructor(
    public readonly currentStatus: TaskStatus,
    public readonly attemptedStatus: TaskStatus,
  ) {
    super(
      `Invalid transition from ${currentStatus} to ${attemptedStatus}`,
    );
    this.name = 'InvalidStateTransitionError';
  }
}
