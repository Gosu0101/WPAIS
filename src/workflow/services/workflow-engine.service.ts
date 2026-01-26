import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { 
  TaskStatus, 
  TaskType, 
  TASK_DEPENDENCY_CHAIN, 
  isValidTransition, 
  WORKFLOW_EVENTS, 
  TaskUnlockedEvent,
  EpisodeProgress,
  TaskTypeProgress,
  EpisodeCompletedEvent,
} from '../types';
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
  constructor(private readonly eventEmitter: EventEmitter2) {}
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
   * 작업 시작 (READY → IN_PROGRESS)
   * 상태 전이 검증과 의존성 검증을 수행한 후 작업을 시작 상태로 변경
   * 
   * @param page 대상 Page 엔티티
   * @param taskType 시작할 작업 유형
   * @returns 업데이트된 Page 엔티티
   * @throws InvalidStateTransitionError 현재 상태가 READY가 아닌 경우
   * @throws LockedException 선행 작업이 완료되지 않은 경우
   * 
   * Requirements: 2.4, 3.1, 3.2, 3.3
   */
  startTask(page: Page, taskType: TaskType): Page {
    const currentStatus = this.getTaskStatus(page, taskType);

    // 1. 상태 전이 검증 (READY → IN_PROGRESS만 허용)
    this.validateTransition(currentStatus, TaskStatus.IN_PROGRESS);

    // 2. 의존성 검증 (선행 작업이 DONE인지 확인)
    this.validateDependency(page, taskType);

    // 3. 상태 변경
    this.setTaskStatus(page, taskType, TaskStatus.IN_PROGRESS);

    return page;
  }

  /**
   * 작업 완료 (IN_PROGRESS → DONE)
   * 상태 전이 검증 후 작업을 완료 상태로 변경하고 자동 잠금 해제 트리거
   * 
   * @param page 대상 Page 엔티티
   * @param taskType 완료할 작업 유형
   * @returns 업데이트된 Page 엔티티 (다음 작업이 자동 해제됨)
   * @throws InvalidStateTransitionError 현재 상태가 IN_PROGRESS가 아닌 경우
   * 
   * Requirements: 2.5, 4.1, 4.2, 4.3
   */
  completeTask(page: Page, taskType: TaskType): Page {
    const currentStatus = this.getTaskStatus(page, taskType);

    // 1. 상태 전이 검증 (IN_PROGRESS → DONE만 허용)
    this.validateTransition(currentStatus, TaskStatus.DONE);

    // 2. 상태 변경
    this.setTaskStatus(page, taskType, TaskStatus.DONE);

    // 3. 자동 잠금 해제 트리거
    return this.unlockNextTask(page, taskType);
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
      
      // TaskUnlockedEvent 발행
      this.emitTaskUnlockedEvent(page.id, nextTaskType);
    }

    return page;
  }

  /**
   * TaskUnlockedEvent 발행
   * 작업이 READY 상태로 변경될 때 이벤트 발행
   * 
   * @param pageId 페이지 ID
   * @param taskType 잠금 해제된 작업 유형
   * 
   * Requirements: 7.1, 7.2
   */
  private emitTaskUnlockedEvent(pageId: string, taskType: TaskType): void {
    const event: TaskUnlockedEvent = {
      pageId,
      taskType,
      timestamp: new Date(),
    };
    this.eventEmitter.emit(WORKFLOW_EVENTS.TASK_UNLOCKED, event);
  }

  /**
   * 에피소드 진행률 계산
   * 완료된 Task 수 / 전체 Task 수 (20개) × 100
   * TaskType별 진행률 breakdown 포함
   * 
   * @param episodeId 에피소드 ID
   * @param pages 해당 에피소드의 Page 배열 (5개)
   * @returns EpisodeProgress 객체
   * 
   * Requirements: 5.1, 5.3
   */
  calculateEpisodeProgress(episodeId: string, pages: Page[]): EpisodeProgress {
    const totalPages = pages.length;
    const totalTasks = totalPages * 4; // 4 task types per page

    // TaskType별 완료 카운트 초기화
    const completedByType: Record<TaskType, number> = {
      [TaskType.BACKGROUND]: 0,
      [TaskType.LINE_ART]: 0,
      [TaskType.COLORING]: 0,
      [TaskType.POST_PROCESSING]: 0,
    };

    // 각 페이지의 완료된 작업 카운트
    for (const page of pages) {
      if (page.backgroundStatus === TaskStatus.DONE) {
        completedByType[TaskType.BACKGROUND]++;
      }
      if (page.lineArtStatus === TaskStatus.DONE) {
        completedByType[TaskType.LINE_ART]++;
      }
      if (page.coloringStatus === TaskStatus.DONE) {
        completedByType[TaskType.COLORING]++;
      }
      if (page.postProcessingStatus === TaskStatus.DONE) {
        completedByType[TaskType.POST_PROCESSING]++;
      }
    }

    // 전체 완료 작업 수
    const completedTasks = Object.values(completedByType).reduce((sum, count) => sum + count, 0);

    // TaskType별 진행률 계산
    const byTaskType: Record<TaskType, TaskTypeProgress> = {} as Record<TaskType, TaskTypeProgress>;
    for (const taskType of Object.values(TaskType)) {
      byTaskType[taskType] = {
        total: totalPages,
        completed: completedByType[taskType],
        percentage: totalPages > 0 ? (completedByType[taskType] / totalPages) * 100 : 0,
      };
    }

    return {
      episodeId,
      totalTasks,
      completedTasks,
      percentage: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      byTaskType,
    };
  }

  /**
   * 에피소드 완료 여부 확인
   * 모든 페이지의 모든 작업이 DONE인지 확인
   * 
   * @param pages 에피소드의 Page 배열
   * @returns 모든 작업이 완료되었으면 true
   * 
   * Requirements: 5.2
   */
  isEpisodeCompleted(pages: Page[]): boolean {
    return pages.every(page => 
      page.backgroundStatus === TaskStatus.DONE &&
      page.lineArtStatus === TaskStatus.DONE &&
      page.coloringStatus === TaskStatus.DONE &&
      page.postProcessingStatus === TaskStatus.DONE
    );
  }

  /**
   * 에피소드 완료 처리
   * 모든 작업이 완료되었는지 확인하고 EpisodeCompletedEvent 발행
   * 
   * @param episodeId 에피소드 ID
   * @param pages 에피소드의 Page 배열
   * @returns 에피소드가 완료되었으면 true
   * 
   * Requirements: 5.2, 7.2
   */
  checkAndEmitEpisodeCompleted(episodeId: string, pages: Page[]): boolean {
    if (this.isEpisodeCompleted(pages)) {
      const event: EpisodeCompletedEvent = {
        episodeId,
        completedAt: new Date(),
      };
      this.eventEmitter.emit(WORKFLOW_EVENTS.EPISODE_COMPLETED, event);
      return true;
    }
    return false;
  }

  /**
   * 페이지 초기화
   * Episode 생성 시 지정된 수의 Page를 자동 생성
   * 
   * @param episodeId 에피소드 ID
   * @param count 생성할 페이지 수 (기본값: 5)
   * @returns 생성된 Page 배열
   * 
   * Requirements: 1.1, 1.3
   */
  initializePages(episodeId: string, count: number = 5): Page[] {
    const pages: Page[] = [];

    for (let i = 1; i <= count; i++) {
      const page = new Page();
      page.id = `${episodeId}-page-${i}`;
      page.episodeId = episodeId;
      page.pageNumber = i;
      page.heightPx = 20000;
      page.backgroundStatus = TaskStatus.READY;
      page.lineArtStatus = TaskStatus.LOCKED;
      page.coloringStatus = TaskStatus.LOCKED;
      page.postProcessingStatus = TaskStatus.LOCKED;
      page.createdAt = new Date();
      page.updatedAt = new Date();

      pages.push(page);
    }

    return pages;
  }
}
