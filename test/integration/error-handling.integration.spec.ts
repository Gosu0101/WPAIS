import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WorkflowEngineService } from '../../src/workflow/services';
import { TaskStatus, TaskType } from '../../src/workflow/types';
import { InvalidStateTransitionError, LockedException } from '../../src/workflow/errors';
import { createTestPage, createCompletedPage } from '../utils/test-factories';
import { completeTasksUpTo } from '../utils/test-helpers';

describe('Error Handling Integration', () => {
  let module: TestingModule;
  let workflowEngine: WorkflowEngineService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [WorkflowEngineService],
    }).compile();

    workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('잘못된 상태 전이', () => {
    /**
     * Requirements: 6.1
     * LOCKED → IN_PROGRESS 시도 → InvalidStateTransitionError
     * DONE → IN_PROGRESS 시도 → InvalidStateTransitionError
     */
    it('LOCKED 상태에서 IN_PROGRESS로 전이 시 InvalidStateTransitionError가 발생해야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // LINE_ART는 LOCKED 상태
      expect(page.lineArtStatus).toBe(TaskStatus.LOCKED);

      expect(() => {
        workflowEngine.startTask(page, TaskType.LINE_ART);
      }).toThrow(InvalidStateTransitionError);
    });

    it('DONE 상태에서 IN_PROGRESS로 전이 시 InvalidStateTransitionError가 발생해야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // BACKGROUND 완료
      let updatedPage = workflowEngine.startTask(page, TaskType.BACKGROUND);
      updatedPage = workflowEngine.completeTask(updatedPage, TaskType.BACKGROUND);

      expect(updatedPage.backgroundStatus).toBe(TaskStatus.DONE);

      // DONE → IN_PROGRESS 시도
      expect(() => {
        workflowEngine.startTask(updatedPage, TaskType.BACKGROUND);
      }).toThrow(InvalidStateTransitionError);
    });

    it('IN_PROGRESS 상태에서 READY로 전이 시 InvalidStateTransitionError가 발생해야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // BACKGROUND 시작
      const inProgressPage = workflowEngine.startTask(page, TaskType.BACKGROUND);
      expect(inProgressPage.backgroundStatus).toBe(TaskStatus.IN_PROGRESS);

      // IN_PROGRESS → READY 시도 (validateTransition 직접 호출)
      expect(() => {
        workflowEngine.validateTransition(TaskStatus.IN_PROGRESS, TaskStatus.READY);
      }).toThrow(InvalidStateTransitionError);
    });
  });

  describe('의존성 미충족', () => {
    /**
     * Requirements: 6.2
     * BACKGROUND 미완료 상태에서 LINE_ART 시작 → LockedException
     */
    it('BACKGROUND 미완료 시 LINE_ART 시작하면 LockedException이 발생해야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // BACKGROUND를 READY로 변경 (LINE_ART도 READY로 가정)
      page.lineArtStatus = TaskStatus.READY;

      expect(() => {
        workflowEngine.validateDependency(page, TaskType.LINE_ART);
      }).toThrow(LockedException);
    });

    it('LINE_ART 미완료 시 COLORING 시작하면 LockedException이 발생해야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // BACKGROUND만 완료
      let updatedPage = workflowEngine.startTask(page, TaskType.BACKGROUND);
      updatedPage = workflowEngine.completeTask(updatedPage, TaskType.BACKGROUND);

      // COLORING을 READY로 강제 변경
      updatedPage.coloringStatus = TaskStatus.READY;

      expect(() => {
        workflowEngine.validateDependency(updatedPage, TaskType.COLORING);
      }).toThrow(LockedException);
    });

    it('COLORING 미완료 시 POST_PROCESSING 시작하면 LockedException이 발생해야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // LINE_ART까지 완료
      let updatedPage = completeTasksUpTo(workflowEngine, page, TaskType.LINE_ART);

      // POST_PROCESSING을 READY로 강제 변경
      updatedPage.postProcessingStatus = TaskStatus.READY;

      expect(() => {
        workflowEngine.validateDependency(updatedPage, TaskType.POST_PROCESSING);
      }).toThrow(LockedException);
    });
  });

  describe('데이터 정합성 유지', () => {
    /**
     * Requirements: 6.4
     * 에러 발생 후 데이터 상태 검증
     */
    it('에러 발생 후 원래 상태가 유지되어야 한다', () => {
      const page = createTestPage('episode-1', 1);
      const originalStatus = { ...page };

      // 잘못된 작업 시도
      try {
        workflowEngine.startTask(page, TaskType.LINE_ART);
      } catch (e) {
        // 에러 발생 예상
      }

      // 원래 상태 유지 확인
      expect(page.backgroundStatus).toBe(originalStatus.backgroundStatus);
      expect(page.lineArtStatus).toBe(originalStatus.lineArtStatus);
      expect(page.coloringStatus).toBe(originalStatus.coloringStatus);
      expect(page.postProcessingStatus).toBe(originalStatus.postProcessingStatus);
    });

    it('부분 완료 후 에러 발생 시 완료된 작업은 유지되어야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // BACKGROUND 완료
      let updatedPage = workflowEngine.startTask(page, TaskType.BACKGROUND);
      updatedPage = workflowEngine.completeTask(updatedPage, TaskType.BACKGROUND);

      const afterBackgroundStatus = { ...updatedPage };

      // 잘못된 작업 시도 (COLORING 직접 시작)
      updatedPage.coloringStatus = TaskStatus.READY;
      try {
        workflowEngine.validateDependency(updatedPage, TaskType.COLORING);
      } catch (e) {
        // 에러 발생 예상
      }

      // BACKGROUND 완료 상태는 유지
      expect(updatedPage.backgroundStatus).toBe(TaskStatus.DONE);
      expect(updatedPage.lineArtStatus).toBe(TaskStatus.READY);
    });
  });
});
