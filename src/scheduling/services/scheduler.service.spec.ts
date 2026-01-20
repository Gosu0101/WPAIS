import * as fc from 'fast-check';
import { SchedulerService } from './scheduler.service';
import { VelocityConfigService } from './velocity-config.service';

describe('SchedulerService', () => {
  let schedulerService: SchedulerService;
  let velocityConfigService: VelocityConfigService;

  beforeEach(() => {
    velocityConfigService = new VelocityConfigService();
    schedulerService = new SchedulerService(velocityConfigService);
  });

  describe('calculateSealDate', () => {
    it('should calculate seal date as 30 days before launch date', () => {
      const launchDate = new Date('2027-01-31');
      const sealDate = schedulerService.calculateSealDate(launchDate);
      
      expect(sealDate).toEqual(new Date('2027-01-01'));
    });

    it('should handle month boundary correctly', () => {
      const launchDate = new Date('2027-03-15');
      const sealDate = schedulerService.calculateSealDate(launchDate);
      
      expect(sealDate).toEqual(new Date('2027-02-13'));
    });

    it('should handle year boundary correctly', () => {
      const launchDate = new Date('2027-01-15');
      const sealDate = schedulerService.calculateSealDate(launchDate);
      
      expect(sealDate).toEqual(new Date('2026-12-16'));
    });

    it('should not mutate the original launch date', () => {
      const launchDate = new Date('2027-06-01');
      const originalTime = launchDate.getTime();
      
      schedulerService.calculateSealDate(launchDate);
      
      expect(launchDate.getTime()).toBe(originalTime);
    });

    /**
     * Feature: scheduling-engine, Property 1: Seal Date Calculation
     * 
     * *For any* valid launch date, the calculated seal date SHALL equal
     * the launch date minus exactly 30 days.
     * 
     * **Validates: Requirements 1.1, 3.1**
     */
    it('should calculate seal date as exactly 30 days before launch date for any valid date (Property 1)', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2025-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
          (launchDate: Date) => {
            const sealDate = schedulerService.calculateSealDate(launchDate);
            
            // Calculate expected seal date (launch date - 30 days)
            const expectedSealDate = new Date(launchDate);
            expectedSealDate.setDate(expectedSealDate.getDate() - 30);
            
            // Verify the difference is exactly 30 days
            const diffInMs = launchDate.getTime() - sealDate.getTime();
            const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
            
            expect(diffInDays).toBe(30);
            expect(sealDate.getTime()).toBe(expectedSealDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateTotalProductionDuration', () => {
    it('should calculate 140 days for 10 episodes (10 × 14 days)', () => {
      const duration = schedulerService.calculateTotalProductionDuration(10);
      expect(duration).toBe(140);
    });

    it('should calculate 147 days for 11 episodes (10 × 14 + 1 × 7)', () => {
      const duration = schedulerService.calculateTotalProductionDuration(11);
      expect(duration).toBe(147);
    });

    it('should throw error for invalid episode count', () => {
      expect(() => schedulerService.calculateTotalProductionDuration(0)).toThrow();
      expect(() => schedulerService.calculateTotalProductionDuration(-1)).toThrow();
    });
  });

  describe('calculateProductionStartDate', () => {
    it('should calculate production start date correctly for 10 episodes', () => {
      const launchDate = new Date('2027-01-31');
      const productionStartDate = schedulerService.calculateProductionStartDate(launchDate, 10);
      
      // Seal date: 2027-01-01 (launch - 30 days)
      // Total duration: 140 days (10 × 14)
      // Production start: 2027-01-01 - 140 days = 2026-08-14
      expect(productionStartDate).toEqual(new Date('2026-08-14'));
    });

    /**
     * Feature: scheduling-engine, Property 4: Production Start Date Calculation
     * 
     * *For any* launch date and episode count, the production start date SHALL equal
     * the seal date minus the total production duration, where total production duration
     * is the sum of all episode durations.
     * 
     * **Validates: Requirements 1.2, 3.2**
     */
    it('should calculate production start date as seal date minus total duration for any valid inputs (Property 4)', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2025-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
          fc.integer({ min: 1, max: 100 }),
          (launchDate: Date, episodeCount: number) => {
            const productionStartDate = schedulerService.calculateProductionStartDate(launchDate, episodeCount);
            const sealDate = schedulerService.calculateSealDate(launchDate);
            const totalDuration = schedulerService.calculateTotalProductionDuration(episodeCount);
            
            // Calculate expected production start date
            const expectedStartDate = new Date(sealDate);
            expectedStartDate.setDate(expectedStartDate.getDate() - totalDuration);
            
            // Verify the production start date equals seal date - total duration
            expect(productionStartDate.getTime()).toBe(expectedStartDate.getTime());
            
            // Verify the relationship: productionStartDate + totalDuration = sealDate
            const verifyDate = new Date(productionStartDate);
            verifyDate.setDate(verifyDate.getDate() + totalDuration);
            expect(verifyDate.getTime()).toBe(sealDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateHiringStartDate', () => {
    it('should calculate hiring start date as 35 days before production start', () => {
      const productionStartDate = new Date('2026-08-14');
      const hiringStartDate = schedulerService.calculateHiringStartDate(productionStartDate);
      
      expect(hiringStartDate).toEqual(new Date('2026-07-10'));
    });

    it('should not mutate the original production start date', () => {
      const productionStartDate = new Date('2026-08-14');
      const originalTime = productionStartDate.getTime();
      
      schedulerService.calculateHiringStartDate(productionStartDate);
      
      expect(productionStartDate.getTime()).toBe(originalTime);
    });
  });

  describe('calculatePlanningStartDate', () => {
    it('should calculate planning start date as 56 days before hiring start', () => {
      const hiringStartDate = new Date('2026-07-10');
      const planningStartDate = schedulerService.calculatePlanningStartDate(hiringStartDate);
      
      expect(planningStartDate).toEqual(new Date('2026-05-15'));
    });

    it('should not mutate the original hiring start date', () => {
      const hiringStartDate = new Date('2026-07-10');
      const originalTime = hiringStartDate.getTime();
      
      schedulerService.calculatePlanningStartDate(hiringStartDate);
      
      expect(hiringStartDate.getTime()).toBe(originalTime);
    });
  });

  describe('Milestone Date Relationships', () => {
    /**
     * Feature: scheduling-engine, Property 7: Milestone Date Relationships
     * 
     * *For any* project, the following date ordering SHALL hold:
     * planningStartDate < hiringStartDate < productionStartDate < sealDate < launchDate
     * 
     * Where:
     * - hiringStartDate = productionStartDate - 35 days
     * - planningStartDate = hiringStartDate - 56 days
     * 
     * **Validates: Requirements 3.4, 3.5**
     */
    it('should maintain correct date ordering for any valid inputs (Property 7)', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2025-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
          fc.integer({ min: 1, max: 100 }),
          (launchDate: Date, episodeCount: number) => {
            const sealDate = schedulerService.calculateSealDate(launchDate);
            const productionStartDate = schedulerService.calculateProductionStartDate(launchDate, episodeCount);
            const hiringStartDate = schedulerService.calculateHiringStartDate(productionStartDate);
            const planningStartDate = schedulerService.calculatePlanningStartDate(hiringStartDate);
            
            // Verify date ordering: planning < hiring < production < seal < launch
            expect(planningStartDate.getTime()).toBeLessThan(hiringStartDate.getTime());
            expect(hiringStartDate.getTime()).toBeLessThan(productionStartDate.getTime());
            expect(productionStartDate.getTime()).toBeLessThan(sealDate.getTime());
            expect(sealDate.getTime()).toBeLessThan(launchDate.getTime());
            
            // Verify exact relationships
            // hiringStartDate = productionStartDate - 35 days
            const expectedHiringDate = new Date(productionStartDate);
            expectedHiringDate.setDate(expectedHiringDate.getDate() - 35);
            expect(hiringStartDate.getTime()).toBe(expectedHiringDate.getTime());
            
            // planningStartDate = hiringStartDate - 56 days
            const expectedPlanningDate = new Date(hiringStartDate);
            expectedPlanningDate.setDate(expectedPlanningDate.getDate() - 56);
            expect(planningStartDate.getTime()).toBe(expectedPlanningDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('generateEpisodeSchedules', () => {
    it('should generate correct schedules for 10 episodes', () => {
      const productionStartDate = new Date('2026-08-14');
      const schedules = schedulerService.generateEpisodeSchedules(productionStartDate, 10);
      
      expect(schedules).toHaveLength(10);
      
      // First episode
      expect(schedules[0].episodeNumber).toBe(1);
      expect(schedules[0].startDate).toEqual(new Date('2026-08-14'));
      expect(schedules[0].dueDate).toEqual(new Date('2026-08-28'));
      expect(schedules[0].duration).toBe(14);
      expect(schedules[0].isLearningPeriod).toBe(true);
      
      // Last episode (10th)
      expect(schedules[9].episodeNumber).toBe(10);
      expect(schedules[9].duration).toBe(14);
      expect(schedules[9].isLearningPeriod).toBe(true);
    });

    it('should generate correct schedules for 12 episodes (mixed periods)', () => {
      const productionStartDate = new Date('2026-08-14');
      const schedules = schedulerService.generateEpisodeSchedules(productionStartDate, 12);
      
      expect(schedules).toHaveLength(12);
      
      // Episode 10 (last learning period)
      expect(schedules[9].episodeNumber).toBe(10);
      expect(schedules[9].duration).toBe(14);
      expect(schedules[9].isLearningPeriod).toBe(true);
      
      // Episode 11 (first normal period)
      expect(schedules[10].episodeNumber).toBe(11);
      expect(schedules[10].duration).toBe(7);
      expect(schedules[10].isLearningPeriod).toBe(false);
      
      // Episode 12
      expect(schedules[11].episodeNumber).toBe(12);
      expect(schedules[11].duration).toBe(7);
      expect(schedules[11].isLearningPeriod).toBe(false);
    });

    it('should throw error for invalid episode count', () => {
      const productionStartDate = new Date('2026-08-14');
      
      expect(() => schedulerService.generateEpisodeSchedules(productionStartDate, 0)).toThrow();
      expect(() => schedulerService.generateEpisodeSchedules(productionStartDate, -1)).toThrow();
    });

    it('should not mutate the original production start date', () => {
      const productionStartDate = new Date('2026-08-14');
      const originalTime = productionStartDate.getTime();
      
      schedulerService.generateEpisodeSchedules(productionStartDate, 10);
      
      expect(productionStartDate.getTime()).toBe(originalTime);
    });

    it('should have consecutive episodes where next start equals previous due date', () => {
      const productionStartDate = new Date('2026-08-14');
      const schedules = schedulerService.generateEpisodeSchedules(productionStartDate, 15);
      
      for (let i = 0; i < schedules.length - 1; i++) {
        expect(schedules[i + 1].startDate.getTime()).toBe(schedules[i].dueDate.getTime());
      }
    });

    /**
     * Feature: scheduling-engine, Property 5: Episode Due Date Ordering
     * 
     * *For any* project with multiple episodes, episode N's due date SHALL be
     * strictly before episode N+1's due date for all consecutive episode pairs.
     * 
     * **Validates: Requirements 4.1**
     */
    it('should have strictly increasing due dates for any valid inputs (Property 5)', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2025-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
          fc.integer({ min: 2, max: 100 }),
          (productionStartDate: Date, episodeCount: number) => {
            const schedules = schedulerService.generateEpisodeSchedules(productionStartDate, episodeCount);
            
            // Verify episode count
            expect(schedules.length).toBe(episodeCount);
            
            // Verify due date ordering: episode N's due date < episode N+1's due date
            for (let i = 0; i < schedules.length - 1; i++) {
              expect(schedules[i].dueDate.getTime()).toBeLessThan(schedules[i + 1].dueDate.getTime());
            }
            
            // Verify episode numbers are sequential
            for (let i = 0; i < schedules.length; i++) {
              expect(schedules[i].episodeNumber).toBe(i + 1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: scheduling-engine, Property 6: Episode Spacing Consistency
     * 
     * *For any* project:
     * - Episodes 1-10 SHALL have due dates spaced exactly 14 days apart
     * - Episodes 11+ SHALL have due dates spaced exactly 7 days apart from the previous episode
     * 
     * **Validates: Requirements 4.2, 4.3**
     */
    it('should have correct spacing between episodes based on period (Property 6)', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2025-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
          fc.integer({ min: 1, max: 100 }),
          (productionStartDate: Date, episodeCount: number) => {
            const schedules = schedulerService.generateEpisodeSchedules(productionStartDate, episodeCount);
            
            for (const schedule of schedules) {
              const expectedDuration = schedule.isLearningPeriod ? 14 : 7;
              
              // Verify duration matches the period
              expect(schedule.duration).toBe(expectedDuration);
              
              // Verify due date = start date + duration
              const expectedDueDate = new Date(schedule.startDate);
              expectedDueDate.setDate(expectedDueDate.getDate() + expectedDuration);
              expect(schedule.dueDate.getTime()).toBe(expectedDueDate.getTime());
              
              // Verify learning period flag is correct
              if (schedule.episodeNumber <= 10) {
                expect(schedule.isLearningPeriod).toBe(true);
                expect(schedule.duration).toBe(14);
              } else {
                expect(schedule.isLearningPeriod).toBe(false);
                expect(schedule.duration).toBe(7);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

});
