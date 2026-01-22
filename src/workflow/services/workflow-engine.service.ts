import { Injectable } from '@nestjs/common';
import { TaskStatus, TaskType, TASK_DEPENDENCY_CHAIN, TASK_TYPE_ORDER, isValidTransition } from '../types';
import { InvalidStateTransitionError, LockedException } from '../errors';
import { Page } from '../entities/page.entity';

/**
 * 후속 작업 체인 정의
 * 각 TaskType 완료 시 자동으로 잠금 해제할 다음 작업
 */
const TASK_SUCCESSOR_CHAIN: Record<TaskType, TaskType | null> = {
  [TaskType.BACKGROUND]: TaskType.LINE_ART,
  [TaskType.LINE_ART]: TaskType.COLORING,
  [TaskType.COLORING]: TaskType.POST_PROCESSING,
  [TaskType.POST_PROCESSING]: null,
};

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

  /**
   * Page에서 특정 TaskType의 상태를 설정
   * 
   * @param page Page 엔티티
   * @param taskType 설정할 작업 유형
   * @param status 설정할 상태
   */
  private setTaskStatus(page: Page, taskType: TaskType, status: TaskStatus): void {
    switch (taskType) {
      case TaskType.BACKGROUND:
        page.backgroundStatus = status;
        break;
      case TaskType.LINE_ART:
        page.lineArtStatus = status;
        break;
      case TaskType.COLORING:
        page.coloringStatus = status;
        break;
      case TaskType.POST_PROCESSING:
        page.postProcessingStatus = status;
        break;
    }
  }

  /**
   * 자동 잠금 해제 (Auto-Unlock)
   * 완료된 작업의 다음 작업을 LOCKED에서 READY로 변경
   * 
   * 자동 해제 체인:
   * - BACKGROUND DONE → LINE_ART를 READY로 변경
   * - LINE_ART DONE → COLORING을 READY로 변경
   * - COLORING DONE → POST_PROCESSING을 READY로 변경
   * 
   * @param page 대상 Page 엔티티
   * @param completedTaskType 완료된 작업 유형
   * @returns 업데이트된 Page (다음 작업이 없으면 그대로 반환)
   * 
   * Requirements: 4.1, 4.2, 4.3
   */
  unlockNextTask(page: Page, completedTaskType: TaskType): Page {
    const nextTaskType = TASK_SUCCESSOR_CHAIN[completedTaskType];

    // POST_PROCESSING은 마지막 작업이므로 다음 작업이 없음
    if (nextTaskType === null) {
      return page;
    }

    const nextTaskStatus = this.getTaskStatus(page, nextTaskType);

    // 다음 작업이 LOCKED 상태인 경우에만 READY로 변경
    if (nextTaskStatus === TaskStatus.LOCKED) {
      this.setTaskStatus(page, nextTaskType, TaskStatus.READY);
    }

    return page;
  }
}
