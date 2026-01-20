import * as fc from 'fast-check';
import {
  VelocityConfig,
  getDefaultVelocityConfig,
  serializeVelocityConfig,
  deserializeVelocityConfig,
} from './velocity-config.type';

describe('VelocityConfig', () => {
  describe('getDefaultVelocityConfig', () => {
    it('should return default values', () => {
      const config = getDefaultVelocityConfig();
      
      expect(config.learningPeriodEnd).toBe(10);
      expect(config.learningPeriodDuration).toBe(14);
      expect(config.normalPeriodDuration).toBe(7);
    });
  });

  describe('serialization round-trip', () => {
    /**
     * Feature: scheduling-engine, Property: VelocityConfig Round-Trip
     * For any valid VelocityConfig, serializing then deserializing should produce an equivalent object.
     */
    it('should preserve data through serialize/deserialize cycle', () => {
      fc.assert(
        fc.property(
          fc.record({
            learningPeriodEnd: fc.integer({ min: 1, max: 100 }),
            learningPeriodDuration: fc.integer({ min: 1, max: 30 }),
            normalPeriodDuration: fc.integer({ min: 1, max: 30 }),
          }),
          (config: VelocityConfig) => {
            const serialized = serializeVelocityConfig(config);
            const deserialized = deserializeVelocityConfig(serialized);
            
            expect(deserialized.learningPeriodEnd).toBe(config.learningPeriodEnd);
            expect(deserialized.learningPeriodDuration).toBe(config.learningPeriodDuration);
            expect(deserialized.normalPeriodDuration).toBe(config.normalPeriodDuration);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
