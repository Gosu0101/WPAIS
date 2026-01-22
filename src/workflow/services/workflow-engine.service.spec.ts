import * as fc from 'fast-check';
import { WorkflowEngineService } from './workflow-engine.service';
import { TaskStatus } from '../types';
import { InvalidStateTransitionError } from '../errors';

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
});
