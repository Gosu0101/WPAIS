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
  });
});
