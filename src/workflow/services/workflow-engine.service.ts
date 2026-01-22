import { Injectable } from '@nestjs/common';
import { TaskStatus, TaskType, TASK_DEPENDENCY_CHAIN, isValidTransition } from '../types';
import { InvalidStateTransitionError, LockedException } from '../errors';
import { Page } from '../entities/page.entity';

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

  /**
   * 스테이지 퍼스트 의존성 검증
   * 선행 작업이 DONE 상태인지 확인
   * 
   * 의존성 체인:
   * - LINE_ART 시작 전 BACKGROUND가 DONE이어야 함
   * - COLORING 시작 전 LINE_ART가 DONE이어야 함
   * - POST_PROCESSING 시작 전 COLORING이 DONE이어야 함
   * 
   * @param page 검증할 Page 엔티티
   * @param taskType 시작하려는 작업 유형
   * @returns 의존성이 충족되면 true
   * @throws LockedException 의존성 미충족 시
   * 
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  validateDependency(page: Page, taskType: TaskType): boolean {
    const requiredPredecessor = TASK_DEPENDENCY_CHAIN[taskType];

    // BACKGROUND는 선행 작업이 없으므로 항상 통과
    if (requiredPredecessor === null) {
      return true;
    }

    const predecessorStatus = this.getTaskStatus(page, requiredPredecessor);

    if (predecessorStatus !== TaskStatus.DONE) {
      throw new LockedException(page.id, taskType, requiredPredecessor);
    }

    return true;
  }

  /**
   * Page에서 특정 TaskType의 상태를 조회
   * 
   * @param page Page 엔티티
   * @param taskType 조회할 작업 유형
   * @returns 해당 작업의 현재 상태
   */
  private getTaskStatus(page: Page, taskType: TaskType): TaskStatus {
    switch (taskType) {
      case TaskType.BACKGROUND:
        return page.backgroundStatus;
      case TaskType.LINE_ART:
        return page.lineArtStatus;
      case TaskType.COLORING:
        return page.coloringStatus;
      case TaskType.POST_PROCESSING:
        return page.postProcessingStatus;
    }
  }
}
