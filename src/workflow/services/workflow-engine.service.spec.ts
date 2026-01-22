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
});
