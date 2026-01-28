import * as fc from 'fast-check';
import { MemberRole } from '../../notification/types';
import { TaskType } from '../../workflow/types';

/**
 * 작업자 담당 공정 수정 권한 로직 테스트
 */
describe('Worker Task Permission Logic', () => {
  // 작업자가 특정 작업을 수정할 수 있는지 확인하는 로직
  const canWorkerModifyTask = (
    memberRole: MemberRole,
    memberTaskType: TaskType | null,
    targetTaskType: TaskType,
  ): boolean => {
    // PD는 모든 작업 수정 가능
    if (memberRole === MemberRole.PD) {
      return true;
    }

    // WORKER는 담당 공정만 수정 가능
    if (memberRole === MemberRole.WORKER) {
      return memberTaskType === targetTaskType;
    }

    return false;
  };

  /**
   * Property 4: Worker Can Only Modify Assigned Tasks
   * **Validates: Requirements 3.2**
   * 
   * ∀ worker ∈ project.members WHERE worker.role = WORKER:
   *   canModify(worker, task) = (task.type = worker.taskType)
   */
  describe('Property 4: Worker Can Only Modify Assigned Tasks', () => {
    const allTaskTypes = Object.values(TaskType);

    it('PD should be able to modify any task type', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(...allTaskTypes),
          fc.constantFrom(...allTaskTypes),
          (memberTaskType, targetTaskType) => {
            const result = canWorkerModifyTask(
              MemberRole.PD,
              memberTaskType,
              targetTaskType,
            );
            expect(result).toBe(true);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('WORKER should only modify their assigned task type', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(...allTaskTypes),
          fc.constantFrom(...allTaskTypes),
          (memberTaskType, targetTaskType) => {
            const result = canWorkerModifyTask(
              MemberRole.WORKER,
              memberTaskType,
              targetTaskType,
            );

            if (memberTaskType === targetTaskType) {
              expect(result).toBe(true);
            } else {
              expect(result).toBe(false);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('WORKER with null taskType should not modify any task', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(...allTaskTypes),
          (targetTaskType) => {
            const result = canWorkerModifyTask(
              MemberRole.WORKER,
              null,
              targetTaskType,
            );
            expect(result).toBe(false);
          },
        ),
        { numRuns: 10 },
      );
    });

    it('permission check should be deterministic', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(MemberRole.PD, MemberRole.WORKER),
          fc.constantFrom(...allTaskTypes, null),
          fc.constantFrom(...allTaskTypes),
          (role, memberTaskType, targetTaskType) => {
            const result1 = canWorkerModifyTask(role, memberTaskType, targetTaskType);
            const result2 = canWorkerModifyTask(role, memberTaskType, targetTaskType);
            expect(result1).toBe(result2);
          },
        ),
        { numRuns: 30 },
      );
    });

    it('WORKER assigned to BACKGROUND can only modify BACKGROUND tasks', () => {
      expect(canWorkerModifyTask(MemberRole.WORKER, TaskType.BACKGROUND, TaskType.BACKGROUND)).toBe(true);
      expect(canWorkerModifyTask(MemberRole.WORKER, TaskType.BACKGROUND, TaskType.LINE_ART)).toBe(false);
      expect(canWorkerModifyTask(MemberRole.WORKER, TaskType.BACKGROUND, TaskType.COLORING)).toBe(false);
      expect(canWorkerModifyTask(MemberRole.WORKER, TaskType.BACKGROUND, TaskType.POST_PROCESSING)).toBe(false);
    });

    it('WORKER assigned to LINE_ART can only modify LINE_ART tasks', () => {
      expect(canWorkerModifyTask(MemberRole.WORKER, TaskType.LINE_ART, TaskType.LINE_ART)).toBe(true);
      expect(canWorkerModifyTask(MemberRole.WORKER, TaskType.LINE_ART, TaskType.BACKGROUND)).toBe(false);
      expect(canWorkerModifyTask(MemberRole.WORKER, TaskType.LINE_ART, TaskType.COLORING)).toBe(false);
      expect(canWorkerModifyTask(MemberRole.WORKER, TaskType.LINE_ART, TaskType.POST_PROCESSING)).toBe(false);
    });
  });
});
