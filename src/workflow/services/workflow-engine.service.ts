import { Injectable } from '@nestjs/common';
import { TaskStatus, isValidTransition } from '../types';
import { InvalidStateTransitionError } from '../errors';

/**
 * WorkflowEngineService
 * 웹툰 제작 공정의 상태 전이와 의존성을 관리하는 서비스
 */
@Injectable()
export class WorkflowEngineService {
  /**
   * 상태 전이 검증
   * 유효한 전이: LOCKED→READY, READY→IN_PROGRESS, IN_PROGRESS→DONE
   * 
   * @param currentStatus 현재 상태
   * @param newStatus 변경하려는 상태
   * @returns 유효한 전이인 경우 true
   * @throws InvalidStateTransitionError 유효하지 않은 전이인 경우
   * 
   * Requirements: 2.3, 2.4, 2.5, 6.1, 6.2
   */
  validateTransition(
    currentStatus: TaskStatus,
    newStatus: TaskStatus,
  ): boolean {
    if (!isValidTransition(currentStatus, newStatus)) {
      throw new InvalidStateTransitionError(currentStatus, newStatus);
    }
    return true;
  }
}
