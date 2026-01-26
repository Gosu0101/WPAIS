import * as fc from 'fast-check';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowEngineService } from './workflow-engine.service';
import { TaskStatus, TaskType, TASK_DEPENDENCY_CHAIN, WORKFLOW_EVENTS } from '../types';
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

/**
 * Mock EventEmitter2 생성 헬퍼
 */
function createMockEventEmitter(): EventEmitter2 {
  return {
    emit: jest.fn(),
  } as unknown as EventEmitter2;
}

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let mockEventEmitter: EventEmitter2;

  beforeEach(() => {
    mockEventEmitter = createMockEventEmitter();
    service = new WorkflowEngineService(mockEventEmitter);
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

  describe('Property 6: Task Unlock Event Emission', () => {
    /**
     * Feature: workflow-engine, Property 6: Task Unlock Event Emission
     * For any task status change to READY:
     * - A TaskUnlockedEvent SHALL be emitted
     * - The event SHALL contain valid pageId, taskType, and timestamp
     * 
     * Validates: Requirements 7.1, 7.2
     */

    // TaskTypes that have successors (all except POST_PROCESSING)
    const taskTypesWithSuccessors: [TaskType, TaskType][] = [
      [TaskType.BACKGROUND, TaskType.LINE_ART],
      [TaskType.LINE_ART, TaskType.COLORING],
      [TaskType.COLORING, TaskType.POST_PROCESSING],
    ];

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should emit TaskUnlockedEvent when unlocking successor task', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...taskTypesWithSuccessors),
          fc.uuid(),
          ([completedTask, successor]: [TaskType, TaskType], pageId: string) => {
            // Reset mock for each iteration
            (mockEventEmitter.emit as jest.Mock).mockClear();

            // Create page with successor in LOCKED status
            const pageOverrides: Partial<Page> = { id: pageId };
            
            switch (completedTask) {
              case TaskType.BACKGROUND:
                pageOverrides.backgroundStatus = TaskStatus.DONE;
                pageOverrides.lineArtStatus = TaskStatus.LOCKED;
                break;
              case TaskType.LINE_ART:
                pageOverrides.backgroundStatus = TaskStatus.DONE;
                pageOverrides.lineArtStatus = TaskStatus.DONE;
                pageOverrides.coloringStatus = TaskStatus.LOCKED;
                break;
              case TaskType.COLORING:
                pageOverrides.backgroundStatus = TaskStatus.DONE;
                pageOverrides.lineArtStatus = TaskStatus.DONE;
                pageOverrides.coloringStatus = TaskStatus.DONE;
                pageOverrides.postProcessingStatus = TaskStatus.LOCKED;
                break;
            }

            const page = createTestPage(pageOverrides);
            service.unlockNextTask(page, completedTask);

            // Verify event was emitted
            expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
              WORKFLOW_EVENTS.TASK_UNLOCKED,
              expect.objectContaining({
                pageId,
                taskType: successor,
                timestamp: expect.any(Date),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT emit event when POST_PROCESSING completes (no successor)', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (pageId: string) => {
            (mockEventEmitter.emit as jest.Mock).mockClear();

            const page = createTestPage({
              id: pageId,
              backgroundStatus: TaskStatus.DONE,
              lineArtStatus: TaskStatus.DONE,
              coloringStatus: TaskStatus.DONE,
              postProcessingStatus: TaskStatus.DONE,
            });

            service.unlockNextTask(page, TaskType.POST_PROCESSING);

            // No event should be emitted
            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT emit event when successor is already unlocked (not LOCKED)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...taskTypesWithSuccessors),
          fc.constantFrom(TaskStatus.READY, TaskStatus.IN_PROGRESS, TaskStatus.DONE),
          fc.uuid(),
          ([completedTask, successor]: [TaskType, TaskType], existingStatus: TaskStatus, pageId: string) => {
            (mockEventEmitter.emit as jest.Mock).mockClear();

            // Create page with successor already in non-LOCKED status
            const pageOverrides: Partial<Page> = { id: pageId };
            
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
            service.unlockNextTask(page, completedTask);

            // No event should be emitted since successor was not LOCKED
            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should emit event with correct timestamp', () => {
      const beforeTime = new Date();
      
      const page = createTestPage({
        id: 'test-page',
        backgroundStatus: TaskStatus.DONE,
        lineArtStatus: TaskStatus.LOCKED,
      });

      service.unlockNextTask(page, TaskType.BACKGROUND);

      const afterTime = new Date();

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        WORKFLOW_EVENTS.TASK_UNLOCKED,
        expect.objectContaining({
          timestamp: expect.any(Date),
        })
      );

      const emittedEvent = (mockEventEmitter.emit as jest.Mock).mock.calls[0][1];
      expect(emittedEvent.timestamp.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
      expect(emittedEvent.timestamp.getTime()).toBeLessThanOrEqual(afterTime.getTime());
    });

    it('should emit event through completeTask when unlocking successor', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...taskTypesWithSuccessors),
          fc.uuid(),
          ([completedTask, successor]: [TaskType, TaskType], pageId: string) => {
            (mockEventEmitter.emit as jest.Mock).mockClear();

            // Create page with task IN_PROGRESS and successor LOCKED
            const pageOverrides: Partial<Page> = { id: pageId };
            
            switch (completedTask) {
              case TaskType.BACKGROUND:
                pageOverrides.backgroundStatus = TaskStatus.IN_PROGRESS;
                pageOverrides.lineArtStatus = TaskStatus.LOCKED;
                break;
              case TaskType.LINE_ART:
                pageOverrides.backgroundStatus = TaskStatus.DONE;
                pageOverrides.lineArtStatus = TaskStatus.IN_PROGRESS;
                pageOverrides.coloringStatus = TaskStatus.LOCKED;
                break;
              case TaskType.COLORING:
                pageOverrides.backgroundStatus = TaskStatus.DONE;
                pageOverrides.lineArtStatus = TaskStatus.DONE;
                pageOverrides.coloringStatus = TaskStatus.IN_PROGRESS;
                pageOverrides.postProcessingStatus = TaskStatus.LOCKED;
                break;
            }

            const page = createTestPage(pageOverrides);
            service.completeTask(page, completedTask);

            // Verify event was emitted through completeTask
            expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
              WORKFLOW_EVENTS.TASK_UNLOCKED,
              expect.objectContaining({
                pageId,
                taskType: successor,
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 5: Episode Progress Calculation', () => {
    /**
     * Feature: workflow-engine, Property 5: Episode Progress Calculation
     * For any Episode with N completed tasks (out of 20 total):
     * - Progress percentage SHALL equal (N / 20) × 100
     * - When N = 20, Episode status SHALL be COMPLETED
     * 
     * Validates: Requirements 5.1, 5.2
     */

    /**
     * 테스트용 Page 배열 생성 헬퍼
     * 각 페이지의 완료된 작업 수를 지정할 수 있음
     */
    function createTestPages(
      episodeId: string,
      completedTasksPerPage: number[] // 각 페이지별 완료된 작업 수 (0-4)
    ): Page[] {
      return completedTasksPerPage.map((completedCount, index) => {
        const page = createTestPage({
          id: `page-${index + 1}`,
          episodeId,
          pageNumber: index + 1,
        });

        // 완료된 작업 수에 따라 상태 설정 (순서대로 완료)
        if (completedCount >= 1) page.backgroundStatus = TaskStatus.DONE;
        if (completedCount >= 2) page.lineArtStatus = TaskStatus.DONE;
        if (completedCount >= 3) page.coloringStatus = TaskStatus.DONE;
        if (completedCount >= 4) page.postProcessingStatus = TaskStatus.DONE;

        return page;
      });
    }

    it('should calculate progress as (completedTasks / totalTasks) * 100', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 5, maxLength: 5 }),
          (episodeId: string, completedTasksPerPage: number[]) => {
            const pages = createTestPages(episodeId, completedTasksPerPage);
            const totalCompleted = completedTasksPerPage.reduce((sum, count) => sum + count, 0);
            const expectedPercentage = (totalCompleted / 20) * 100;

            const progress = service.calculateEpisodeProgress(episodeId, pages);

            expect(progress.episodeId).toBe(episodeId);
            expect(progress.totalTasks).toBe(20);
            expect(progress.completedTasks).toBe(totalCompleted);
            expect(progress.percentage).toBeCloseTo(expectedPercentage, 5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should provide correct breakdown by TaskType', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 5, maxLength: 5 }),
          (episodeId: string, completedTasksPerPage: number[]) => {
            const pages = createTestPages(episodeId, completedTasksPerPage);

            // 각 TaskType별 예상 완료 수 계산
            const expectedByType = {
              [TaskType.BACKGROUND]: completedTasksPerPage.filter(c => c >= 1).length,
              [TaskType.LINE_ART]: completedTasksPerPage.filter(c => c >= 2).length,
              [TaskType.COLORING]: completedTasksPerPage.filter(c => c >= 3).length,
              [TaskType.POST_PROCESSING]: completedTasksPerPage.filter(c => c >= 4).length,
            };

            const progress = service.calculateEpisodeProgress(episodeId, pages);

            for (const taskType of Object.values(TaskType)) {
              expect(progress.byTaskType[taskType].total).toBe(5);
              expect(progress.byTaskType[taskType].completed).toBe(expectedByType[taskType]);
              expect(progress.byTaskType[taskType].percentage).toBeCloseTo(
                (expectedByType[taskType] / 5) * 100,
                5
              );
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return 0% progress for empty pages array', () => {
      const progress = service.calculateEpisodeProgress('empty-episode', []);

      expect(progress.totalTasks).toBe(0);
      expect(progress.completedTasks).toBe(0);
      expect(progress.percentage).toBe(0);
    });

    it('should return 100% progress when all tasks are DONE', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (episodeId: string) => {
            const pages = createTestPages(episodeId, [4, 4, 4, 4, 4]); // All 20 tasks done

            const progress = service.calculateEpisodeProgress(episodeId, pages);

            expect(progress.completedTasks).toBe(20);
            expect(progress.percentage).toBe(100);
            
            // All TaskTypes should be 100%
            for (const taskType of Object.values(TaskType)) {
              expect(progress.byTaskType[taskType].completed).toBe(5);
              expect(progress.byTaskType[taskType].percentage).toBe(100);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly identify episode completion', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.integer({ min: 0, max: 4 }), { minLength: 5, maxLength: 5 }),
          (episodeId: string, completedTasksPerPage: number[]) => {
            const pages = createTestPages(episodeId, completedTasksPerPage);
            const allCompleted = completedTasksPerPage.every(c => c === 4);

            const isCompleted = service.isEpisodeCompleted(pages);

            expect(isCompleted).toBe(allCompleted);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should emit EpisodeCompletedEvent when all tasks are DONE', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (episodeId: string) => {
            (mockEventEmitter.emit as jest.Mock).mockClear();

            const pages = createTestPages(episodeId, [4, 4, 4, 4, 4]); // All 20 tasks done

            const result = service.checkAndEmitEpisodeCompleted(episodeId, pages);

            expect(result).toBe(true);
            expect(mockEventEmitter.emit).toHaveBeenCalledTimes(1);
            expect(mockEventEmitter.emit).toHaveBeenCalledWith(
              WORKFLOW_EVENTS.EPISODE_COMPLETED,
              expect.objectContaining({
                episodeId,
                completedAt: expect.any(Date),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should NOT emit EpisodeCompletedEvent when not all tasks are DONE', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 5, maxLength: 5 }), // At least one incomplete
          (episodeId: string, completedTasksPerPage: number[]) => {
            (mockEventEmitter.emit as jest.Mock).mockClear();

            const pages = createTestPages(episodeId, completedTasksPerPage);

            const result = service.checkAndEmitEpisodeCompleted(episodeId, pages);

            expect(result).toBe(false);
            expect(mockEventEmitter.emit).not.toHaveBeenCalled();
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('initializePages', () => {
    /**
     * initializePages 메서드 단위 테스트
     * Episode 생성 시 5개 Page 자동 생성
     * 
     * Requirements: 1.1, 1.3
     */

    it('should create 5 pages by default', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (episodeId: string) => {
            const pages = service.initializePages(episodeId);

            expect(pages.length).toBe(5);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create pages with sequential page numbers (1-5)', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (episodeId: string) => {
            const pages = service.initializePages(episodeId);

            const pageNumbers = pages.map(p => p.pageNumber).sort((a, b) => a - b);
            expect(pageNumbers).toEqual([1, 2, 3, 4, 5]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should initialize all pages with correct initial status', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (episodeId: string) => {
            const pages = service.initializePages(episodeId);

            pages.forEach(page => {
              expect(page.backgroundStatus).toBe(TaskStatus.READY);
              expect(page.lineArtStatus).toBe(TaskStatus.LOCKED);
              expect(page.coloringStatus).toBe(TaskStatus.LOCKED);
              expect(page.postProcessingStatus).toBe(TaskStatus.LOCKED);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should set height to 20,000px for all pages', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (episodeId: string) => {
            const pages = service.initializePages(episodeId);

            pages.forEach(page => {
              expect(page.heightPx).toBe(20000);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should set episodeId for all pages', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (episodeId: string) => {
            const pages = service.initializePages(episodeId);

            pages.forEach(page => {
              expect(page.episodeId).toBe(episodeId);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create custom number of pages when specified', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.integer({ min: 1, max: 10 }),
          (episodeId: string, count: number) => {
            const pages = service.initializePages(episodeId, count);

            expect(pages.length).toBe(count);
            
            const pageNumbers = pages.map(p => p.pageNumber).sort((a, b) => a - b);
            const expectedNumbers = Array.from({ length: count }, (_, i) => i + 1);
            expect(pageNumbers).toEqual(expectedNumbers);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
