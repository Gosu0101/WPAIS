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
          fc.date({ min: new Date('2025-01-01'), max: new Date('2100-12-31') }),
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
});
