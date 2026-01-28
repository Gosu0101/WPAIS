import * as fc from 'fast-check';
import {
  getEpisodeColor,
  getMilestoneColor,
  getTaskColor,
  getProjectColor,
  assignProjectColors,
  isUrgent,
  isOverdue,
  getDeadlineStatus,
  EVENT_COLORS,
  PROJECT_COLORS,
  URGENT_THRESHOLD_DAYS,
} from './calendar-colors';

describe('Calendar Colors Utilities', () => {
  describe('getEpisodeColor', () => {
    it('should return SEALED color when isSealed is true', () => {
      expect(getEpisodeColor('PENDING', true)).toBe(EVENT_COLORS.episode.SEALED);
      expect(getEpisodeColor('IN_PROGRESS', true)).toBe(EVENT_COLORS.episode.SEALED);
      expect(getEpisodeColor('COMPLETED', true)).toBe(EVENT_COLORS.episode.SEALED);
    });

    it('should return status-based color when not sealed', () => {
      expect(getEpisodeColor('PENDING', false)).toBe(EVENT_COLORS.episode.PENDING);
      expect(getEpisodeColor('IN_PROGRESS', false)).toBe(EVENT_COLORS.episode.IN_PROGRESS);
      expect(getEpisodeColor('COMPLETED', false)).toBe(EVENT_COLORS.episode.COMPLETED);
    });
  });

  describe('getMilestoneColor', () => {
    it('should return completed color when isCompleted is true', () => {
      const futureDate = new Date(Date.now() + 86400000);
      expect(getMilestoneColor(true, futureDate)).toBe(EVENT_COLORS.milestone.completed);
    });

    it('should return overdue color when past due and not completed', () => {
      const pastDate = new Date(Date.now() - 86400000);
      expect(getMilestoneColor(false, pastDate)).toBe(EVENT_COLORS.milestone.overdue);
    });

    it('should return default color when not completed and not overdue', () => {
      const futureDate = new Date(Date.now() + 86400000);
      expect(getMilestoneColor(false, futureDate)).toBe(EVENT_COLORS.milestone.default);
    });
  });

  describe('getTaskColor', () => {
    it('should return correct color for each status', () => {
      expect(getTaskColor('LOCKED')).toBe(EVENT_COLORS.task.LOCKED);
      expect(getTaskColor('READY')).toBe(EVENT_COLORS.task.READY);
      expect(getTaskColor('IN_PROGRESS')).toBe(EVENT_COLORS.task.IN_PROGRESS);
      expect(getTaskColor('DONE')).toBe(EVENT_COLORS.task.DONE);
    });
  });

  describe('getProjectColor', () => {
    it('should cycle through colors', () => {
      expect(getProjectColor(0)).toBe(PROJECT_COLORS[0]);
      expect(getProjectColor(PROJECT_COLORS.length)).toBe(PROJECT_COLORS[0]);
    });
  });

  describe('assignProjectColors', () => {
    /**
     * Validates: Requirements 8.1
     * Property: Project Color Uniqueness - All projects have different colors (within palette size)
     */
    it('should assign unique colors to projects within palette size', () => {
      fc.assert(
        fc.property(
          fc.array(fc.uuid(), { minLength: 1, maxLength: PROJECT_COLORS.length }),
          (projectIds) => {
            const projects = projectIds.map(id => ({ id }));
            const colorMap = assignProjectColors(projects);

            // All projects should have a color
            expect(colorMap.size).toBe(projects.length);

            // Within palette size, all colors should be unique
            if (projects.length <= PROJECT_COLORS.length) {
              const colors = Array.from(colorMap.values());
              const uniqueColors = new Set(colors);
              expect(uniqueColors.size).toBe(colors.length);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Deadline Utilities', () => {
    describe('isUrgent', () => {
      it('should return true for dates within threshold', () => {
        const tomorrow = new Date(Date.now() + 86400000);
        expect(isUrgent(tomorrow)).toBe(true);
      });

      it('should return false for dates beyond threshold', () => {
        const farFuture = new Date(Date.now() + 86400000 * 10);
        expect(isUrgent(farFuture)).toBe(false);
      });

      it('should return false for past dates', () => {
        const yesterday = new Date(Date.now() - 86400000);
        expect(isUrgent(yesterday)).toBe(false);
      });
    });

    describe('isOverdue', () => {
      it('should return true for past dates when not completed', () => {
        const yesterday = new Date(Date.now() - 86400000);
        expect(isOverdue(yesterday, false)).toBe(true);
      });

      it('should return false for past dates when completed', () => {
        const yesterday = new Date(Date.now() - 86400000);
        expect(isOverdue(yesterday, true)).toBe(false);
      });

      it('should return false for future dates', () => {
        const tomorrow = new Date(Date.now() + 86400000);
        expect(isOverdue(tomorrow, false)).toBe(false);
      });
    });

    /**
     * Validates: Requirements 9.1, 9.2
     * Property: Deadline Warning Accuracy
     */
    describe('getDeadlineStatus - Property Tests', () => {
      it('should correctly classify deadline status', () => {
        fc.assert(
          fc.property(
            fc.integer({ min: -30, max: 30 }), // days from now
            fc.boolean(),
            (daysFromNow, isCompleted) => {
              const dueDate = new Date(Date.now() + daysFromNow * 86400000);
              const status = getDeadlineStatus(dueDate, isCompleted);

              if (isCompleted) {
                // Completed items are never overdue
                expect(status).not.toBe('overdue');
              } else if (daysFromNow < 0) {
                // Past due and not completed = overdue
                expect(status).toBe('overdue');
              } else if (daysFromNow > 0 && daysFromNow <= URGENT_THRESHOLD_DAYS) {
                // Within threshold = urgent
                expect(status).toBe('urgent');
              } else if (daysFromNow > URGENT_THRESHOLD_DAYS) {
                // Beyond threshold = normal
                expect(status).toBe('normal');
              }
            }
          ),
          { numRuns: 50 }
        );
      });
    });
  });

  /**
   * Validates: Requirements 2.2, 3.3, 4.3
   * Property: Status-Color Mapping Consistency
   */
  describe('Status-Color Mapping Property Tests', () => {
    it('should consistently map episode status to color', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('PENDING', 'IN_PROGRESS', 'COMPLETED') as fc.Arbitrary<'PENDING' | 'IN_PROGRESS' | 'COMPLETED'>,
          fc.boolean(),
          (status, isSealed) => {
            const color1 = getEpisodeColor(status, isSealed);
            const color2 = getEpisodeColor(status, isSealed);
            
            // Same inputs should always produce same output
            expect(color1).toBe(color2);
            
            // Color should be a valid hex color
            expect(color1).toMatch(/^#[0-9a-f]{6}$/i);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should consistently map task status to color', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('LOCKED', 'READY', 'IN_PROGRESS', 'DONE') as fc.Arbitrary<'LOCKED' | 'READY' | 'IN_PROGRESS' | 'DONE'>,
          (status) => {
            const color1 = getTaskColor(status);
            const color2 = getTaskColor(status);
            
            expect(color1).toBe(color2);
            expect(color1).toMatch(/^#[0-9a-f]{6}$/i);
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});
