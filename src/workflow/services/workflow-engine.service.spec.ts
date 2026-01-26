import * as fc from 'fast-check';
import { WorkflowEngineService } from './workflow-engine.service';
import { TaskStatus, TaskType, TASK_DEPENDENCY_CHAIN } from '../types';
import { InvalidStateTransitionError, LockedException } from '../errors';
import { Page } from '../entities/page.entity';

/**
 * 테스트용 Page 객체 생성 헬퍼
 */
function createTestPage(overrides: Partial<Page> = {}): Page {
  const page = new Page();
  page.id = 'test-page-id';
  page.episodeId = 'test-episode-id';
  page.pageNumber = 1;
  page.heightPx = 20000;
  page.backgroundStatus = TaskStatus.READY;
  page.lineArtStatus = TaskStatus.LOCKED;
  page.coloringStatus = TaskStatus.LOCKED;
  page.postProcessingStatus = TaskStatus.LOCKED;
  page.createdAt = new Date();
  page.updatedAt = new Date();
  
  return Object.assign(page, overrides);
}

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;

  beforeEach(() => {
    service = new WorkflowEngineService();
  });

  describe('Property 4: Valid State Transitions Only', () => {
    /**
     * Feature: workflow-engine, Property 4: Valid State Transitions Only
     * For any Task status transition attempt:
     * - Only these transitions are valid: LOCKED→READY, READY→IN_PROGRESS, IN_PROGRESS→DONE
     * - Any other transition SHALL throw InvalidStateTransitionError
     * 
     * Validates: Requirements 2.3, 2.4, 2.5, 6.1, 6.2
     */

    // Valid transitions that should succeed
    const validTransitions: [TaskStatus, TaskStatus][] = [
      [TaskStatus.LOCKED, TaskStatus.READY],
      [TaskStatus.READY, TaskStatus.IN_PROGRESS],
      [TaskStatus.IN_PROGRESS, TaskStatus.DONE],
    ];

    // Invalid transitions that should throw
    const invalidTransitions: [TaskStatus, TaskStatus][] = [
      // From LOCKED
      [TaskStatus.LOCKED, TaskStatus.IN_PROGRESS],
      [TaskStatus.LOCKED, TaskStatus.DONE],
      [TaskStatus.LOCKED, TaskStatus.LOCKED],
      // From READY
      [TaskStatus.READY, TaskStatus.LOCKED],
      [TaskStatus.READY, TaskStatus.DONE],
      [TaskStatus.READY, TaskStatus.READY],
      // From IN_PROGRESS
      [TaskStatus.IN_PROGRESS, TaskStatus.LOCKED],
      [TaskStatus.IN_PROGRESS, TaskStatus.READY],
      [TaskStatus.IN_PROGRESS, TaskStatus.IN_PROGRESS],
      // From DONE
      [TaskStatus.DONE, TaskStatus.LOCKED],
      [TaskStatus.DONE, TaskStatus.READY],
      [TaskStatus.DONE, TaskStatus.IN_PROGRESS],
      [TaskStatus.DONE, TaskStatus.DONE],
    ];


    it('should allow all valid transitions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...validTransitions),
          ([from, to]: [TaskStatus, TaskStatus]) => {
            const result = service.validateTransition(from, to);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw InvalidStateTransitionError for all invalid transitions', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...invalidTransitions),
          ([from, to]: [TaskStatus, TaskStatus]) => {
            expect(() => service.validateTransition(from, to)).toThrow(
              InvalidStateTransitionError
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include correct status values in error message', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...invalidTransitions),
          ([from, to]: [TaskStatus, TaskStatus]) => {
            try {
              service.validateTransition(from, to);
              fail('Expected InvalidStateTransitionError to be thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(InvalidStateTransitionError);
              const err = error as InvalidStateTransitionError;
              expect(err.currentStatus).toBe(from);
              expect(err.attemptedStatus).toBe(to);
              expect(err.message).toContain(from);
              expect(err.message).toContain(to);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce the complete valid transition chain: LOCKED→READY→IN_PROGRESS→DONE', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            // Test the complete valid workflow chain
            expect(service.validateTransition(TaskStatus.LOCKED, TaskStatus.READY)).toBe(true);
            expect(service.validateTransition(TaskStatus.READY, TaskStatus.IN_PROGRESS)).toBe(true);
            expect(service.validateTransition(TaskStatus.IN_PROGRESS, TaskStatus.DONE)).toBe(true);

            // DONE is terminal - no valid transitions from DONE
            expect(() => service.validateTransition(TaskStatus.DONE, TaskStatus.LOCKED)).toThrow(InvalidStateTransitionError);
            expect(() => service.validateTransition(TaskStatus.DONE, TaskStatus.READY)).toThrow(InvalidStateTransitionError);
            expect(() => service.validateTransition(TaskStatus.DONE, TaskStatus.IN_PROGRESS)).toThrow(InvalidStateTransitionError);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  describe('Property 2: Stage-First Dependency Enforcement', () => {
    /**
     * Feature: workflow-engine, Property 2: Stage-First Dependency Enforcement
     * For any Page and for any TaskType T where T ≠ BACKGROUND:
     * - IF the predecessor task is not DONE
     * - THEN attempting to start task T SHALL throw LockedException
     * 
     * Dependency chain: BACKGROUND → LINE_ART → COLORING → POST_PROCESSING
     * 
     * Validates: Requirements 3.1, 3.2, 3.3, 3.4
     */

    // TaskTypes that have dependencies (all except BACKGROUND)
    const dependentTaskTypes = [
      TaskType.LINE_ART,
      TaskType.COLORING,
      TaskType.POST_PROCESSING,
    ];

    // Non-DONE statuses that should cause LockedException
    const nonDoneStatuses = [
      TaskStatus.LOCKED,
      TaskStatus.READY,
      TaskStatus.IN_PROGRESS,
    ];

    it('should allow BACKGROUND to start without any dependency', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(TaskStatus)),
          (anyStatus: TaskStatus) => {
            // BACKGROUND has no predecessor, so it should always pass dependency check
            const page = createTestPage({ backgroundStatus: anyStatus });
            const result = service.validateDependency(page, TaskType.BACKGROUND);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw LockedException when predecessor is not DONE', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...dependentTaskTypes),
          fc.constantFrom(...nonDoneStatuses),
          (taskType: TaskType, predecessorStatus: TaskStatus) => {
            const predecessor = TASK_DEPENDENCY_CHAIN[taskType]!;
            
            // Create page with predecessor in non-DONE status
            const pageOverrides: Partial<Page> = {};
            switch (predecessor) {
              case TaskType.BACKGROUND:
                pageOverrides.backgroundStatus = predecessorStatus;
                break;
              case TaskType.LINE_ART:
                pageOverrides.lineArtStatus = predecessorStatus;
                break;
              case TaskType.COLORING:
                pageOverrides.coloringStatus = predecessorStatus;
                break;
            }
            
            const page = createTestPage(pageOverrides);
            
            expect(() => service.validateDependency(page, taskType)).toThrow(LockedException);
          }
        ),
        { numRuns: 100 }
      );
    });


    it('should allow task to start when predecessor is DONE', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...dependentTaskTypes),
          (taskType: TaskType) => {
            const predecessor = TASK_DEPENDENCY_CHAIN[taskType]!;
            
            // Create page with predecessor in DONE status
            const pageOverrides: Partial<Page> = {};
            switch (predecessor) {
              case TaskType.BACKGROUND:
                pageOverrides.backgroundStatus = TaskStatus.DONE;
                break;
              case TaskType.LINE_ART:
                pageOverrides.lineArtStatus = TaskStatus.DONE;
                break;
              case TaskType.COLORING:
                pageOverrides.coloringStatus = TaskStatus.DONE;
                break;
            }
            
            const page = createTestPage(pageOverrides);
            
            const result = service.validateDependency(page, taskType);
            expect(result).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include correct error details in LockedException', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...dependentTaskTypes),
          fc.constantFrom(...nonDoneStatuses),
          fc.uuid(),
          (taskType: TaskType, predecessorStatus: TaskStatus, pageId: string) => {
            const predecessor = TASK_DEPENDENCY_CHAIN[taskType]!;
            
            // Create page with predecessor in non-DONE status
            const pageOverrides: Partial<Page> = { id: pageId };
            switch (predecessor) {
              case TaskType.BACKGROUND:
                pageOverrides.backgroundStatus = predecessorStatus;
                break;
              case TaskType.LINE_ART:
                pageOverrides.lineArtStatus = predecessorStatus;
                break;
              case TaskType.COLORING:
                pageOverrides.coloringStatus = predecessorStatus;
                break;
            }
            
            const page = createTestPage(pageOverrides);
            
            try {
              service.validateDependency(page, taskType);
              fail('Expected LockedException to be thrown');
            } catch (error) {
              expect(error).toBeInstanceOf(LockedException);
              const err = error as LockedException;
              expect(err.pageId).toBe(pageId);
              expect(err.taskType).toBe(taskType);
              expect(err.requiredPredecessor).toBe(predecessor);
              expect(err.message).toContain(taskType);
              expect(err.message).toContain(predecessor);
            }
          }
        ),
        { numRuns: 100 }
      );
    });


    it('should enforce the complete dependency chain: BACKGROUND → LINE_ART → COLORING → POST_PROCESSING', () => {
      fc.assert(
        fc.property(
          fc.constant(null),
          () => {
            // Initial state: only BACKGROUND can start
            const initialPage = createTestPage();
            expect(service.validateDependency(initialPage, TaskType.BACKGROUND)).toBe(true);
            expect(() => service.validateDependency(initialPage, TaskType.LINE_ART)).toThrow(LockedException);
            expect(() => service.validateDependency(initialPage, TaskType.COLORING)).toThrow(LockedException);
            expect(() => service.validateDependency(initialPage, TaskType.POST_PROCESSING)).toThrow(LockedException);

            // After BACKGROUND is DONE: LINE_ART can start
            const afterBackground = createTestPage({ backgroundStatus: TaskStatus.DONE });
            expect(service.validateDependency(afterBackground, TaskType.LINE_ART)).toBe(true);
            expect(() => service.validateDependency(afterBackground, TaskType.COLORING)).toThrow(LockedException);
            expect(() => service.validateDependency(afterBackground, TaskType.POST_PROCESSING)).toThrow(LockedException);

            // After LINE_ART is DONE: COLORING can start
            const afterLineArt = createTestPage({
              backgroundStatus: TaskStatus.DONE,
              lineArtStatus: TaskStatus.DONE,
            });
            expect(service.validateDependency(afterLineArt, TaskType.COLORING)).toBe(true);
            expect(() => service.validateDependency(afterLineArt, TaskType.POST_PROCESSING)).toThrow(LockedException);

            // After COLORING is DONE: POST_PROCESSING can start
            const afterColoring = createTestPage({
              backgroundStatus: TaskStatus.DONE,
              lineArtStatus: TaskStatus.DONE,
              coloringStatus: TaskStatus.DONE,
            });
            expect(service.validateDependency(afterColoring, TaskType.POST_PROCESSING)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 3: Auto-Unlock Chain', () => {
    /**
     * Feature: workflow-engine, Property 3: Auto-Unlock Chain
     * For any Page, when a task of type T completes (status → DONE):
     * - The immediate successor task SHALL automatically transition from LOCKED to READY
     * - POST_PROCESSING has no successor, so no unlock occurs
     * 
     * Auto-unlock chain:
     * - BACKGROUND DONE → LINE_ART becomes READY
     * - LINE_ART DONE → COLORING becomes READY
     * - COLORING DONE → POST_PROCESSING becomes READY
     * 
     * Validates: Requirements 4.1, 4.2, 4.3, 4.4
     */

    // TaskTypes that have successors (all except POST_PROCESSING)
    const taskTypesWithSuccessors: [TaskType, TaskType][] = [
      [TaskType.BACKGROUND, TaskType.LINE_ART],
      [TaskType.LINE_ART, TaskType.COLORING],
      [TaskType.COLORING, TaskType.POST_PROCESSING],
    ];

    it('should unlock LINE_ART when BACKGROUND completes', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.integer({ min: 1, max: 5 }),
          (pageId: string, episodeId: string, pageNumber: number) => {
            const page = createTestPage({
              id: pageId,
              episodeId,
              pageNumber,
              backgroundStatus: TaskStatus.DONE,
              lineArtStatus: TaskStatus.LOCKED,
            });

            const result = service.unlockNextTask(page, TaskType.BACKGROUND);

            expect(result.lineArtStatus).toBe(TaskStatus.READY);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should unlock COLORING when LINE_ART completes', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.integer({ min: 1, max: 5 }),
          (pageId: string, episodeId: string, pageNumber: number) => {
            const page = createTestPage({
              id: pageId,
              episodeId,
              pageNumber,
              backgroundStatus: TaskStatus.DONE,
              lineArtStatus: TaskStatus.DONE,
              coloringStatus: TaskStatus.LOCKED,
            });

            const result = service.unlockNextTask(page, TaskType.LINE_ART);

            expect(result.coloringStatus).toBe(TaskStatus.READY);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should unlock POST_PROCESSING when COLORING completes', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.integer({ min: 1, max: 5 }),
          (pageId: string, episodeId: string, pageNumber: number) => {
            const page = createTestPage({
              id: pageId,
              episodeId,
              pageNumber,
              backgroundStatus: TaskStatus.DONE,
              lineArtStatus: TaskStatus.DONE,
              coloringStatus: TaskStatus.DONE,
              postProcessingStatus: TaskStatus.LOCKED,
            });

            const result = service.unlockNextTask(page, TaskType.COLORING);

            expect(result.postProcessingStatus).toBe(TaskStatus.READY);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not change anything when POST_PROCESSING completes (no successor)', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          fc.integer({ min: 1, max: 5 }),
          (pageId: string, episodeId: string, pageNumber: number) => {
            const page = createTestPage({
              id: pageId,
              episodeId,
              pageNumber,
              backgroundStatus: TaskStatus.DONE,
              lineArtStatus: TaskStatus.DONE,
              coloringStatus: TaskStatus.DONE,
              postProcessingStatus: TaskStatus.DONE,
            });

            const result = service.unlockNextTask(page, TaskType.POST_PROCESSING);

            // All statuses should remain unchanged
            expect(result.backgroundStatus).toBe(TaskStatus.DONE);
            expect(result.lineArtStatus).toBe(TaskStatus.DONE);
            expect(result.coloringStatus).toBe(TaskStatus.DONE);
            expect(result.postProcessingStatus).toBe(TaskStatus.DONE);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only unlock LOCKED tasks (not change already READY/IN_PROGRESS/DONE)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...taskTypesWithSuccessors),
          fc.constantFrom(TaskStatus.READY, TaskStatus.IN_PROGRESS, TaskStatus.DONE),
          fc.uuid(),
          ([completedTask, successor]: [TaskType, TaskType], existingStatus: TaskStatus, pageId: string) => {
            // Create page with successor already in non-LOCKED status
            const pageOverrides: Partial<Page> = { id: pageId };
            
            // Set completed task to DONE
            switch (completedTask) {
              case TaskType.BACKGROUND:
                pageOverrides.backgroundStatus = TaskStatus.DONE;
                pageOverrides.lineArtStatus = existingStatus;
                break;
              case TaskType.LINE_ART:
                pageOverrides.backgroundStatus = TaskStatus.DONE;
                pageOverrides.lineArtStatus = TaskStatus.DONE;
                pageOverrides.coloringStatus = existingStatus;
                break;
              case TaskType.COLORING:
                pageOverrides.backgroundStatus = TaskStatus.DONE;
                pageOverrides.lineArtStatus = TaskStatus.DONE;
                pageOverrides.coloringStatus = TaskStatus.DONE;
                pageOverrides.postProcessingStatus = existingStatus;
                break;
            }

            const page = createTestPage(pageOverrides);
            const result = service.unlockNextTask(page, completedTask);

            // Successor status should remain unchanged (not overwritten to READY)
            switch (successor) {
              case TaskType.LINE_ART:
                expect(result.lineArtStatus).toBe(existingStatus);
                break;
              case TaskType.COLORING:
                expect(result.coloringStatus).toBe(existingStatus);
                break;
              case TaskType.POST_PROCESSING:
                expect(result.postProcessingStatus).toBe(existingStatus);
                break;
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce the complete auto-unlock chain: BACKGROUND → LINE_ART → COLORING → POST_PROCESSING', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.uuid(),
          (pageId: string, episodeId: string) => {
            // Start with initial page state
            let page = createTestPage({
              id: pageId,
              episodeId,
              backgroundStatus: TaskStatus.READY,
              lineArtStatus: TaskStatus.LOCKED,
              coloringStatus: TaskStatus.LOCKED,
              postProcessingStatus: TaskStatus.LOCKED,
            });

            // Simulate BACKGROUND completion
            page.backgroundStatus = TaskStatus.DONE;
            page = service.unlockNextTask(page, TaskType.BACKGROUND);
            expect(page.lineArtStatus).toBe(TaskStatus.READY);
            expect(page.coloringStatus).toBe(TaskStatus.LOCKED);
            expect(page.postProcessingStatus).toBe(TaskStatus.LOCKED);

            // Simulate LINE_ART completion
            page.lineArtStatus = TaskStatus.DONE;
            page = service.unlockNextTask(page, TaskType.LINE_ART);
            expect(page.coloringStatus).toBe(TaskStatus.READY);
            expect(page.postProcessingStatus).toBe(TaskStatus.LOCKED);

            // Simulate COLORING completion
            page.coloringStatus = TaskStatus.DONE;
            page = service.unlockNextTask(page, TaskType.COLORING);
            expect(page.postProcessingStatus).toBe(TaskStatus.READY);

            // Simulate POST_PROCESSING completion (no more unlocks)
            page.postProcessingStatus = TaskStatus.DONE;
            page = service.unlockNextTask(page, TaskType.POST_PROCESSING);
            // All tasks should be DONE
            expect(page.backgroundStatus).toBe(TaskStatus.DONE);
            expect(page.lineArtStatus).toBe(TaskStatus.DONE);
            expect(page.coloringStatus).toBe(TaskStatus.DONE);
            expect(page.postProcessingStatus).toBe(TaskStatus.DONE);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('startTask', () => {
    /**
     * startTask 메서드 단위 테스트
     * READY → IN_PROGRESS 전이와 의존성 검증을 수행
     * 
     * Requirements: 2.4, 3.1, 3.2, 3.3
     */

    it('should start BACKGROUND task when status is READY', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.READY,
      });

      const result = service.startTask(page, TaskType.BACKGROUND);

      expect(result.backgroundStatus).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should start LINE_ART task when BACKGROUND is DONE and LINE_ART is READY', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.DONE,
        lineArtStatus: TaskStatus.READY,
      });

      const result = service.startTask(page, TaskType.LINE_ART);

      expect(result.lineArtStatus).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should start COLORING task when LINE_ART is DONE and COLORING is READY', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.DONE,
        lineArtStatus: TaskStatus.DONE,
        coloringStatus: TaskStatus.READY,
      });

      const result = service.startTask(page, TaskType.COLORING);

      expect(result.coloringStatus).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should start POST_PROCESSING task when COLORING is DONE and POST_PROCESSING is READY', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.DONE,
        lineArtStatus: TaskStatus.DONE,
        coloringStatus: TaskStatus.DONE,
        postProcessingStatus: TaskStatus.READY,
      });

      const result = service.startTask(page, TaskType.POST_PROCESSING);

      expect(result.postProcessingStatus).toBe(TaskStatus.IN_PROGRESS);
    });

    it('should throw InvalidStateTransitionError when task is LOCKED', () => {
      const page = createTestPage({
        lineArtStatus: TaskStatus.LOCKED,
      });

      expect(() => service.startTask(page, TaskType.LINE_ART)).toThrow(
        InvalidStateTransitionError
      );
    });

    it('should throw InvalidStateTransitionError when task is already IN_PROGRESS', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.IN_PROGRESS,
      });

      expect(() => service.startTask(page, TaskType.BACKGROUND)).toThrow(
        InvalidStateTransitionError
      );
    });

    it('should throw InvalidStateTransitionError when task is already DONE', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.DONE,
      });

      expect(() => service.startTask(page, TaskType.BACKGROUND)).toThrow(
        InvalidStateTransitionError
      );
    });

    it('should throw LockedException when LINE_ART is READY but BACKGROUND is not DONE', () => {
      // This scenario shouldn't happen in normal workflow, but we test the validation
      const page = createTestPage({
        backgroundStatus: TaskStatus.IN_PROGRESS,
        lineArtStatus: TaskStatus.READY, // Manually set to READY for testing
      });

      expect(() => service.startTask(page, TaskType.LINE_ART)).toThrow(
        LockedException
      );
    });

    it('should throw LockedException when COLORING is READY but LINE_ART is not DONE', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.DONE,
        lineArtStatus: TaskStatus.IN_PROGRESS,
        coloringStatus: TaskStatus.READY, // Manually set to READY for testing
      });

      expect(() => service.startTask(page, TaskType.COLORING)).toThrow(
        LockedException
      );
    });

    it('should throw LockedException when POST_PROCESSING is READY but COLORING is not DONE', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.DONE,
        lineArtStatus: TaskStatus.DONE,
        coloringStatus: TaskStatus.IN_PROGRESS,
        postProcessingStatus: TaskStatus.READY, // Manually set to READY for testing
      });

      expect(() => service.startTask(page, TaskType.POST_PROCESSING)).toThrow(
        LockedException
      );
    });
  });

  describe('completeTask', () => {
    /**
     * completeTask 메서드 단위 테스트
     * IN_PROGRESS → DONE 전이와 자동 잠금 해제 트리거
     * 
     * Requirements: 2.5, 4.1, 4.2, 4.3
     */

    it('should complete BACKGROUND task and unlock LINE_ART', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.IN_PROGRESS,
        lineArtStatus: TaskStatus.LOCKED,
      });

      const result = service.completeTask(page, TaskType.BACKGROUND);

      expect(result.backgroundStatus).toBe(TaskStatus.DONE);
      expect(result.lineArtStatus).toBe(TaskStatus.READY);
    });

    it('should complete LINE_ART task and unlock COLORING', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.DONE,
        lineArtStatus: TaskStatus.IN_PROGRESS,
        coloringStatus: TaskStatus.LOCKED,
      });

      const result = service.completeTask(page, TaskType.LINE_ART);

      expect(result.lineArtStatus).toBe(TaskStatus.DONE);
      expect(result.coloringStatus).toBe(TaskStatus.READY);
    });

    it('should complete COLORING task and unlock POST_PROCESSING', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.DONE,
        lineArtStatus: TaskStatus.DONE,
        coloringStatus: TaskStatus.IN_PROGRESS,
        postProcessingStatus: TaskStatus.LOCKED,
      });

      const result = service.completeTask(page, TaskType.COLORING);

      expect(result.coloringStatus).toBe(TaskStatus.DONE);
      expect(result.postProcessingStatus).toBe(TaskStatus.READY);
    });

    it('should complete POST_PROCESSING task (no successor to unlock)', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.DONE,
        lineArtStatus: TaskStatus.DONE,
        coloringStatus: TaskStatus.DONE,
        postProcessingStatus: TaskStatus.IN_PROGRESS,
      });

      const result = service.completeTask(page, TaskType.POST_PROCESSING);

      expect(result.postProcessingStatus).toBe(TaskStatus.DONE);
    });

    it('should throw InvalidStateTransitionError when task is LOCKED', () => {
      const page = createTestPage({
        lineArtStatus: TaskStatus.LOCKED,
      });

      expect(() => service.completeTask(page, TaskType.LINE_ART)).toThrow(
        InvalidStateTransitionError
      );
    });

    it('should throw InvalidStateTransitionError when task is READY', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.READY,
      });

      expect(() => service.completeTask(page, TaskType.BACKGROUND)).toThrow(
        InvalidStateTransitionError
      );
    });

    it('should throw InvalidStateTransitionError when task is already DONE', () => {
      const page = createTestPage({
        backgroundStatus: TaskStatus.DONE,
      });

      expect(() => service.completeTask(page, TaskType.BACKGROUND)).toThrow(
        InvalidStateTransitionError
      );
    });

    it('should complete full workflow chain: BACKGROUND → LINE_ART → COLORING → POST_PROCESSING', () => {
      // Start with initial page state
      let page = createTestPage({
        backgroundStatus: TaskStatus.READY,
        lineArtStatus: TaskStatus.LOCKED,
        coloringStatus: TaskStatus.LOCKED,
        postProcessingStatus: TaskStatus.LOCKED,
      });

      // Start and complete BACKGROUND
      page = service.startTask(page, TaskType.BACKGROUND);
      expect(page.backgroundStatus).toBe(TaskStatus.IN_PROGRESS);
      page = service.completeTask(page, TaskType.BACKGROUND);
      expect(page.backgroundStatus).toBe(TaskStatus.DONE);
      expect(page.lineArtStatus).toBe(TaskStatus.READY);

      // Start and complete LINE_ART
      page = service.startTask(page, TaskType.LINE_ART);
      expect(page.lineArtStatus).toBe(TaskStatus.IN_PROGRESS);
      page = service.completeTask(page, TaskType.LINE_ART);
      expect(page.lineArtStatus).toBe(TaskStatus.DONE);
      expect(page.coloringStatus).toBe(TaskStatus.READY);

      // Start and complete COLORING
      page = service.startTask(page, TaskType.COLORING);
      expect(page.coloringStatus).toBe(TaskStatus.IN_PROGRESS);
      page = service.completeTask(page, TaskType.COLORING);
      expect(page.coloringStatus).toBe(TaskStatus.DONE);
      expect(page.postProcessingStatus).toBe(TaskStatus.READY);

      // Start and complete POST_PROCESSING
      page = service.startTask(page, TaskType.POST_PROCESSING);
      expect(page.postProcessingStatus).toBe(TaskStatus.IN_PROGRESS);
      page = service.completeTask(page, TaskType.POST_PROCESSING);
      expect(page.postProcessingStatus).toBe(TaskStatus.DONE);

      // All tasks should be DONE
      expect(page.backgroundStatus).toBe(TaskStatus.DONE);
      expect(page.lineArtStatus).toBe(TaskStatus.DONE);
      expect(page.coloringStatus).toBe(TaskStatus.DONE);
      expect(page.postProcessingStatus).toBe(TaskStatus.DONE);
    });
  });
});
