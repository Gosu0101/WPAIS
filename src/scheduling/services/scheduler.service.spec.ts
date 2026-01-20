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
});
