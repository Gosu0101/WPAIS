import * as fc from 'fast-check';
import { VelocityConfigService } from './velocity-config.service';
import { getDefaultVelocityConfig } from '../types';

describe('VelocityConfigService', () => {
  let service: VelocityConfigService;

  beforeEach(() => {
    service = new VelocityConfigService();
  });

  describe('getDuration', () => {
    /**
     * Feature: scheduling-engine, Property 2: Duration Calculation by Episode Number
     * 
     * *For any* episode number, the calculated duration SHALL be:
     * - 14 days if episode number is between 1 and 10 (inclusive)
     * - 7 days if episode number is 11 or greater
     * 
     * **Validates: Requirements 2.1, 2.2**
     */
    it('should return correct duration based on episode number (Property 2)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 1000 }),
          (episodeNumber: number) => {
            const duration = service.getDuration(episodeNumber);
            const config = getDefaultVelocityConfig();
            
            if (episodeNumber <= config.learningPeriodEnd) {
              // Learning period: episodes 1-10 should have 14 days
              expect(duration).toBe(config.learningPeriodDuration);
            } else {
              // Normal period: episodes 11+ should have 7 days
              expect(duration).toBe(config.normalPeriodDuration);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should throw error for invalid episode numbers', () => {
      expect(() => service.getDuration(0)).toThrow('Invalid episode number');
      expect(() => service.getDuration(-1)).toThrow('Invalid episode number');
    });
  });

  describe('isLearningPeriod', () => {
    it('should return true for episodes 1-10', () => {
      for (let i = 1; i <= 10; i++) {
        expect(service.isLearningPeriod(i)).toBe(true);
      }
    });

    it('should return false for episodes 11+', () => {
      expect(service.isLearningPeriod(11)).toBe(false);
      expect(service.isLearningPeriod(100)).toBe(false);
    });

    it('should throw error for invalid episode numbers', () => {
      expect(() => service.isLearningPeriod(0)).toThrow('Invalid episode number');
      expect(() => service.isLearningPeriod(-1)).toThrow('Invalid episode number');
    });
  });

  describe('getConfig', () => {
    it('should return a copy of the config', () => {
      const config = service.getConfig();
      expect(config).toEqual(getDefaultVelocityConfig());
    });
  });
});
