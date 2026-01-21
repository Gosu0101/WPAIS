import * as fc from 'fast-check';
import { SchedulerService } from './scheduler.service';
import { VelocityConfigService } from './velocity-config.service';
import { MilestoneType } from '../entities';
import { InsufficientTimeError } from '../errors';

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

  describe('generateMilestones', () => {
    it('should generate all required milestones for 10 episodes', () => {
      const launchDate = new Date('2027-01-31');
      const milestones = schedulerService.generateMilestones(launchDate, 10);
      
      // Should have 7 milestones: planning, hiring, production start, 3ep, 5ep, 7ep seal, launch
      expect(milestones).toHaveLength(7);
      
      // Verify milestone types
      const types = milestones.map(m => m.type);
      expect(types).toContain(MilestoneType.PLANNING_COMPLETE);
      expect(types).toContain(MilestoneType.HIRING_COMPLETE);
      expect(types).toContain(MilestoneType.PRODUCTION_START);
      expect(types).toContain(MilestoneType.EPISODE_3_COMPLETE);
      expect(types).toContain(MilestoneType.EPISODE_5_COMPLETE);
      expect(types).toContain(MilestoneType.EPISODE_7_SEAL);
      expect(types).toContain(MilestoneType.LAUNCH);
    });

    it('should generate fewer milestones for small episode counts', () => {
      const launchDate = new Date('2027-01-31');
      
      // 2 episodes: no 3ep, 5ep, 7ep milestones
      const milestones2 = schedulerService.generateMilestones(launchDate, 2);
      expect(milestones2).toHaveLength(4); // planning, hiring, production start, launch
      
      // 4 episodes: has 3ep, no 5ep, 7ep
      const milestones4 = schedulerService.generateMilestones(launchDate, 4);
      expect(milestones4).toHaveLength(5); // planning, hiring, production start, 3ep, launch
      
      // 6 episodes: has 3ep, 5ep, no 7ep
      const milestones6 = schedulerService.generateMilestones(launchDate, 6);
      expect(milestones6).toHaveLength(6); // planning, hiring, production start, 3ep, 5ep, launch
    });

    it('should set 7-episode seal milestone date equal to seal date', () => {
      const launchDate = new Date('2027-01-31');
      const milestones = schedulerService.generateMilestones(launchDate, 10);
      const sealDate = schedulerService.calculateSealDate(launchDate);
      
      const sealMilestone = milestones.find(m => m.type === MilestoneType.EPISODE_7_SEAL);
      expect(sealMilestone).toBeDefined();
      expect(sealMilestone!.targetDate.getTime()).toBe(sealDate.getTime());
    });

    it('should set launch milestone date equal to launch date', () => {
      const launchDate = new Date('2027-01-31');
      const milestones = schedulerService.generateMilestones(launchDate, 10);
      
      const launchMilestone = milestones.find(m => m.type === MilestoneType.LAUNCH);
      expect(launchMilestone).toBeDefined();
      expect(launchMilestone!.targetDate.getTime()).toBe(launchDate.getTime());
    });

    it('should throw error for invalid episode count', () => {
      const launchDate = new Date('2027-01-31');
      
      expect(() => schedulerService.generateMilestones(launchDate, 0)).toThrow();
      expect(() => schedulerService.generateMilestones(launchDate, -1)).toThrow();
    });

    it('should not mutate the original launch date', () => {
      const launchDate = new Date('2027-01-31');
      const originalTime = launchDate.getTime();
      
      schedulerService.generateMilestones(launchDate, 10);
      
      expect(launchDate.getTime()).toBe(originalTime);
    });

    /**
     * Feature: scheduling-engine, Property 8: Milestone Generation Completeness
     * 
     * *For any* created project, the milestone list SHALL contain at least:
     * - Planning completion milestone
     * - Hiring completion milestone
     * - Production start milestone
     * - 3-episode completion milestone (if episodeCount >= 3)
     * - 5-episode completion milestone (if episodeCount >= 5)
     * - 7-episode seal milestone (if episodeCount >= 7)
     * 
     * **Validates: Requirements 5.1, 3.3**
     */
    it('should generate all required milestones for any valid inputs (Property 8)', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2025-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
          fc.integer({ min: 1, max: 100 }),
          (launchDate: Date, episodeCount: number) => {
            const milestones = schedulerService.generateMilestones(launchDate, episodeCount);
            const types = milestones.map(m => m.type);
            
            // Required milestones for all projects
            expect(types).toContain(MilestoneType.PLANNING_COMPLETE);
            expect(types).toContain(MilestoneType.HIRING_COMPLETE);
            expect(types).toContain(MilestoneType.PRODUCTION_START);
            expect(types).toContain(MilestoneType.LAUNCH);
            
            // Conditional milestones based on episode count
            if (episodeCount >= 3) {
              expect(types).toContain(MilestoneType.EPISODE_3_COMPLETE);
            } else {
              expect(types).not.toContain(MilestoneType.EPISODE_3_COMPLETE);
            }
            
            if (episodeCount >= 5) {
              expect(types).toContain(MilestoneType.EPISODE_5_COMPLETE);
            } else {
              expect(types).not.toContain(MilestoneType.EPISODE_5_COMPLETE);
            }
            
            if (episodeCount >= 7) {
              expect(types).toContain(MilestoneType.EPISODE_7_SEAL);
            } else {
              expect(types).not.toContain(MilestoneType.EPISODE_7_SEAL);
            }
            
            // Verify no duplicate milestone types
            const uniqueTypes = new Set(types);
            expect(uniqueTypes.size).toBe(types.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: scheduling-engine, Property 9: Seal Milestone Date Consistency
     * 
     * *For any* project, the 7-episode seal milestone's target date SHALL equal
     * the project's seal date.
     * 
     * **Validates: Requirements 5.4**
     */
    it('should have seal milestone date equal to seal date for any valid inputs (Property 9)', () => {
      fc.assert(
        fc.property(
          fc.date({ min: new Date('2025-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
          fc.integer({ min: 7, max: 100 }), // At least 7 episodes to have seal milestone
          (launchDate: Date, episodeCount: number) => {
            const milestones = schedulerService.generateMilestones(launchDate, episodeCount);
            const sealDate = schedulerService.calculateSealDate(launchDate);
            
            // Find the 7-episode seal milestone
            const sealMilestone = milestones.find(m => m.type === MilestoneType.EPISODE_7_SEAL);
            
            // Verify seal milestone exists and has correct date
            expect(sealMilestone).toBeDefined();
            expect(sealMilestone!.targetDate.getTime()).toBe(sealDate.getTime());
            
            // Verify seal milestone name
            expect(sealMilestone!.name).toBe('7화 봉인');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('calculateMasterSchedule', () => {
    it('should return a complete MasterSchedule object for 10 episodes', () => {
      const launchDate = new Date('2027-01-31');
      const masterSchedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      
      // Verify all required fields are present
      expect(masterSchedule.launchDate).toBeDefined();
      expect(masterSchedule.sealDate).toBeDefined();
      expect(masterSchedule.productionStartDate).toBeDefined();
      expect(masterSchedule.hiringStartDate).toBeDefined();
      expect(masterSchedule.planningStartDate).toBeDefined();
      expect(masterSchedule.totalProductionDays).toBeDefined();
      expect(masterSchedule.episodes).toBeDefined();
      expect(masterSchedule.milestones).toBeDefined();
    });

    it('should calculate correct dates for 10 episodes', () => {
      const launchDate = new Date('2027-01-31');
      const masterSchedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      
      // Verify launch date
      expect(masterSchedule.launchDate.getTime()).toBe(launchDate.getTime());
      
      // Verify seal date (launch - 30 days)
      expect(masterSchedule.sealDate).toEqual(new Date('2027-01-01'));
      
      // Verify total production days (10 × 14 = 140)
      expect(masterSchedule.totalProductionDays).toBe(140);
      
      // Verify production start date (seal - 140 days = 2026-08-14)
      expect(masterSchedule.productionStartDate).toEqual(new Date('2026-08-14'));
      
      // Verify hiring start date (production - 35 days = 2026-07-10)
      expect(masterSchedule.hiringStartDate).toEqual(new Date('2026-07-10'));
      
      // Verify planning start date (hiring - 56 days = 2026-05-15)
      expect(masterSchedule.planningStartDate).toEqual(new Date('2026-05-15'));
    });

    it('should generate correct number of episodes', () => {
      const launchDate = new Date('2027-01-31');
      
      const schedule10 = schedulerService.calculateMasterSchedule(launchDate, 10);
      expect(schedule10.episodes).toHaveLength(10);
      
      const schedule15 = schedulerService.calculateMasterSchedule(launchDate, 15);
      expect(schedule15.episodes).toHaveLength(15);
    });

    it('should generate correct milestones', () => {
      const launchDate = new Date('2027-01-31');
      const masterSchedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      
      // Should have 7 milestones for 10 episodes
      expect(masterSchedule.milestones).toHaveLength(7);
      
      const types = masterSchedule.milestones.map(m => m.type);
      expect(types).toContain(MilestoneType.PLANNING_COMPLETE);
      expect(types).toContain(MilestoneType.HIRING_COMPLETE);
      expect(types).toContain(MilestoneType.PRODUCTION_START);
      expect(types).toContain(MilestoneType.EPISODE_3_COMPLETE);
      expect(types).toContain(MilestoneType.EPISODE_5_COMPLETE);
      expect(types).toContain(MilestoneType.EPISODE_7_SEAL);
      expect(types).toContain(MilestoneType.LAUNCH);
    });

    it('should use default episode count of 10 when not specified', () => {
      const launchDate = new Date('2027-01-31');
      const masterSchedule = schedulerService.calculateMasterSchedule(launchDate);
      
      expect(masterSchedule.episodes).toHaveLength(10);
      expect(masterSchedule.totalProductionDays).toBe(140);
    });

    it('should throw error for invalid episode count', () => {
      const launchDate = new Date('2027-01-31');
      
      expect(() => schedulerService.calculateMasterSchedule(launchDate, 0)).toThrow();
      expect(() => schedulerService.calculateMasterSchedule(launchDate, -1)).toThrow();
    });

    it('should not mutate the original launch date', () => {
      const launchDate = new Date('2027-01-31');
      const originalTime = launchDate.getTime();
      
      schedulerService.calculateMasterSchedule(launchDate, 10);
      
      expect(launchDate.getTime()).toBe(originalTime);
    });

    it('should maintain date ordering: planning < hiring < production < seal < launch', () => {
      const launchDate = new Date('2027-01-31');
      const masterSchedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      
      expect(masterSchedule.planningStartDate.getTime()).toBeLessThan(masterSchedule.hiringStartDate.getTime());
      expect(masterSchedule.hiringStartDate.getTime()).toBeLessThan(masterSchedule.productionStartDate.getTime());
      expect(masterSchedule.productionStartDate.getTime()).toBeLessThan(masterSchedule.sealDate.getTime());
      expect(masterSchedule.sealDate.getTime()).toBeLessThan(masterSchedule.launchDate.getTime());
    });

    it('should have first episode start on production start date', () => {
      const launchDate = new Date('2027-01-31');
      const masterSchedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      
      expect(masterSchedule.episodes[0].startDate.getTime()).toBe(masterSchedule.productionStartDate.getTime());
    });

    it('should calculate correct total production days for mixed periods', () => {
      const launchDate = new Date('2027-01-31');
      
      // 12 episodes: 10 × 14 + 2 × 7 = 140 + 14 = 154 days
      const schedule12 = schedulerService.calculateMasterSchedule(launchDate, 12);
      expect(schedule12.totalProductionDays).toBe(154);
      
      // 15 episodes: 10 × 14 + 5 × 7 = 140 + 35 = 175 days
      const schedule15 = schedulerService.calculateMasterSchedule(launchDate, 15);
      expect(schedule15.totalProductionDays).toBe(175);
    });
  });

  describe('validateSchedule', () => {
    it('should return valid result for future production start date', () => {
      // Launch date far in the future
      const launchDate = new Date('2030-01-31');
      const schedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      const currentDate = new Date('2025-01-01');
      
      const result = schedulerService.validateSchedule(schedule, currentDate);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error when production start date is in the past', () => {
      // Launch date that results in past production start
      const launchDate = new Date('2025-06-01');
      const schedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      const currentDate = new Date('2025-01-01');
      
      const result = schedulerService.validateSchedule(schedule, currentDate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Insufficient time');
    });

    it('should return error when production start date equals current date', () => {
      const launchDate = new Date('2027-01-31');
      const schedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      // Set current date to exactly the production start date
      const currentDate = new Date(schedule.productionStartDate);
      
      const result = schedulerService.validateSchedule(schedule, currentDate);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect milestone date conflicts and return warnings', () => {
      const launchDate = new Date('2027-01-31');
      const schedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      const currentDate = new Date('2025-01-01');
      
      const result = schedulerService.validateSchedule(schedule, currentDate);
      
      // Hiring complete and production start are on the same date (this is normal)
      // So we should not have warnings for this specific case
      const conflictWarnings = result.warnings.filter(w => w.code === 'MILESTONE_DATE_CONFLICT');
      // The hiring complete and production start being on same date is expected
      expect(conflictWarnings.length).toBe(0);
    });

    it('should use current date as default when not provided', () => {
      // Launch date far in the future
      const launchDate = new Date('2050-01-31');
      const schedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      
      const result = schedulerService.validateSchedule(schedule);
      
      expect(result.isValid).toBe(true);
    });

    /**
     * Feature: scheduling-engine, Property 10: Schedule Validation - Future Start Date
     * 
     * *For any* schedule calculation with a launch date that results in a past
     * production start date, the validation SHALL return an error.
     * 
     * **Validates: Requirements 6.1, 6.2**
     */
    it('should return error for any schedule with past production start date (Property 10)', () => {
      fc.assert(
        fc.property(
          // Generate a launch date
          fc.date({ min: new Date('2025-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
          fc.integer({ min: 1, max: 50 }),
          // Generate a current date that is after the production start date
          fc.integer({ min: 1, max: 365 }), // Days to add to production start date
          (launchDate: Date, episodeCount: number, daysAfterStart: number) => {
            const schedule = schedulerService.calculateMasterSchedule(launchDate, episodeCount);
            
            // Set current date to be after the production start date
            const currentDate = new Date(schedule.productionStartDate);
            currentDate.setDate(currentDate.getDate() + daysAfterStart);
            
            const result = schedulerService.validateSchedule(schedule, currentDate);
            
            // Should be invalid because production start is in the past
            expect(result.isValid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e => e.includes('Insufficient time'))).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: scheduling-engine, Property 10 (Complement): Valid Schedule for Future Start Date
     * 
     * *For any* schedule calculation with a launch date that results in a future
     * production start date, the validation SHALL return valid.
     * 
     * **Validates: Requirements 6.1, 6.2**
     */
    it('should return valid for any schedule with future production start date (Property 10 complement)', () => {
      fc.assert(
        fc.property(
          // Generate a launch date
          fc.date({ min: new Date('2025-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
          fc.integer({ min: 1, max: 50 }),
          // Generate a current date that is before the production start date
          fc.integer({ min: 1, max: 365 }), // Days to subtract from production start date
          (launchDate: Date, episodeCount: number, daysBeforeStart: number) => {
            const schedule = schedulerService.calculateMasterSchedule(launchDate, episodeCount);
            
            // Set current date to be before the production start date
            const currentDate = new Date(schedule.productionStartDate);
            currentDate.setDate(currentDate.getDate() - daysBeforeStart);
            
            const result = schedulerService.validateSchedule(schedule, currentDate);
            
            // Should be valid because production start is in the future
            expect(result.isValid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('validateScheduleOrThrow', () => {
    it('should not throw for valid schedule', () => {
      const launchDate = new Date('2030-01-31');
      const schedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      const currentDate = new Date('2025-01-01');
      
      expect(() => schedulerService.validateScheduleOrThrow(schedule, currentDate)).not.toThrow();
    });

    it('should throw InsufficientTimeError when production start is in the past', () => {
      const launchDate = new Date('2025-06-01');
      const schedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      const currentDate = new Date('2025-01-01');
      
      expect(() => schedulerService.validateScheduleOrThrow(schedule, currentDate))
        .toThrow(InsufficientTimeError);
    });

    it('should include correct dates in InsufficientTimeError', () => {
      const launchDate = new Date('2025-06-01');
      const schedule = schedulerService.calculateMasterSchedule(launchDate, 10);
      const currentDate = new Date('2025-01-01');
      
      try {
        schedulerService.validateScheduleOrThrow(schedule, currentDate);
        fail('Expected InsufficientTimeError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(InsufficientTimeError);
        const insufficientError = error as InsufficientTimeError;
        expect(insufficientError.launchDate.getTime()).toBe(schedule.launchDate.getTime());
        expect(insufficientError.calculatedStartDate.getTime()).toBe(schedule.productionStartDate.getTime());
        expect(insufficientError.currentDate.getTime()).toBe(currentDate.getTime());
      }
    });
  });

  describe('recalculateSchedule', () => {
    it('should recalculate all dates when launch date changes', () => {
      const originalLaunchDate = new Date('2027-01-31');
      const originalSchedule = schedulerService.calculateMasterSchedule(originalLaunchDate, 10);
      
      const newLaunchDate = new Date('2027-03-31');
      const recalculatedSchedule = schedulerService.recalculateSchedule(originalSchedule, newLaunchDate);
      
      // Verify launch date is updated
      expect(recalculatedSchedule.launchDate.getTime()).toBe(newLaunchDate.getTime());
      
      // Verify seal date is updated (new launch - 30 days)
      const expectedSealDate = new Date('2027-03-01');
      expect(recalculatedSchedule.sealDate.getTime()).toBe(expectedSealDate.getTime());
      
      // Verify episode count is preserved
      expect(recalculatedSchedule.episodes.length).toBe(originalSchedule.episodes.length);
    });

    it('should preserve episode count when recalculating', () => {
      const originalLaunchDate = new Date('2027-01-31');
      const originalSchedule = schedulerService.calculateMasterSchedule(originalLaunchDate, 15);
      
      const newLaunchDate = new Date('2027-06-30');
      const recalculatedSchedule = schedulerService.recalculateSchedule(originalSchedule, newLaunchDate);
      
      expect(recalculatedSchedule.episodes.length).toBe(15);
      expect(recalculatedSchedule.totalProductionDays).toBe(originalSchedule.totalProductionDays);
    });

    it('should update all milestone dates proportionally', () => {
      const originalLaunchDate = new Date('2027-01-31');
      const originalSchedule = schedulerService.calculateMasterSchedule(originalLaunchDate, 10);
      
      const newLaunchDate = new Date('2027-03-02'); // 30 days later
      const recalculatedSchedule = schedulerService.recalculateSchedule(originalSchedule, newLaunchDate);
      
      // All dates should shift by 30 days
      const daysDiff = 30;
      
      const originalSealTime = originalSchedule.sealDate.getTime();
      const newSealTime = recalculatedSchedule.sealDate.getTime();
      expect(Math.round((newSealTime - originalSealTime) / (1000 * 60 * 60 * 24))).toBe(daysDiff);
      
      const originalProdStartTime = originalSchedule.productionStartDate.getTime();
      const newProdStartTime = recalculatedSchedule.productionStartDate.getTime();
      expect(Math.round((newProdStartTime - originalProdStartTime) / (1000 * 60 * 60 * 24))).toBe(daysDiff);
    });

    it('should throw error for schedule with no episodes', () => {
      const emptySchedule: any = {
        launchDate: new Date('2027-01-31'),
        sealDate: new Date('2027-01-01'),
        productionStartDate: new Date('2026-08-14'),
        hiringStartDate: new Date('2026-07-10'),
        planningStartDate: new Date('2026-05-15'),
        totalProductionDays: 0,
        episodes: [],
        milestones: [],
      };
      
      expect(() => schedulerService.recalculateSchedule(emptySchedule, new Date('2027-06-30'))).toThrow();
    });

    /**
     * Feature: scheduling-engine, Property 11: Recalculation Consistency
     * 
     * *For any* project, updating the launch date and recalculating SHALL:
     * - Update all milestone dates proportionally
     * - Update all episode due dates proportionally
     * - Preserve the velocity configuration
     * 
     * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
     */
    it('should maintain recalculation consistency for any valid inputs (Property 11)', () => {
      fc.assert(
        fc.property(
          // Original launch date
          fc.date({ min: new Date('2025-01-01'), max: new Date('2050-12-31') }).filter(d => !isNaN(d.getTime())),
          // Episode count
          fc.integer({ min: 1, max: 50 }),
          // Days to shift (positive = later, negative = earlier)
          fc.integer({ min: -365, max: 365 }),
          (originalLaunchDate: Date, episodeCount: number, daysShift: number) => {
            // Create original schedule
            const originalSchedule = schedulerService.calculateMasterSchedule(originalLaunchDate, episodeCount);
            
            // Calculate new launch date
            const newLaunchDate = new Date(originalLaunchDate);
            newLaunchDate.setDate(newLaunchDate.getDate() + daysShift);
            
            // Recalculate schedule
            const recalculatedSchedule = schedulerService.recalculateSchedule(originalSchedule, newLaunchDate);
            
            // Property 7.1: All milestone dates should be updated
            expect(recalculatedSchedule.launchDate.getTime()).toBe(newLaunchDate.getTime());
            
            // Verify seal date is correctly calculated from new launch date
            const expectedSealDate = schedulerService.calculateSealDate(newLaunchDate);
            expect(recalculatedSchedule.sealDate.getTime()).toBe(expectedSealDate.getTime());
            
            // Property 7.2: All episode due dates should be updated
            expect(recalculatedSchedule.episodes.length).toBe(originalSchedule.episodes.length);
            
            // Verify episode due dates are recalculated correctly
            const expectedEpisodes = schedulerService.generateEpisodeSchedules(
              recalculatedSchedule.productionStartDate,
              episodeCount
            );
            for (let i = 0; i < episodeCount; i++) {
              expect(recalculatedSchedule.episodes[i].dueDate.getTime())
                .toBe(expectedEpisodes[i].dueDate.getTime());
            }
            
            // Property 7.3: Velocity configuration should be preserved
            // This is verified by checking that durations remain the same
            for (let i = 0; i < episodeCount; i++) {
              expect(recalculatedSchedule.episodes[i].duration)
                .toBe(originalSchedule.episodes[i].duration);
              expect(recalculatedSchedule.episodes[i].isLearningPeriod)
                .toBe(originalSchedule.episodes[i].isLearningPeriod);
            }
            
            // Property 7.4: Total production days should remain the same
            expect(recalculatedSchedule.totalProductionDays).toBe(originalSchedule.totalProductionDays);
            
            // Verify milestone count is preserved
            expect(recalculatedSchedule.milestones.length).toBe(originalSchedule.milestones.length);
            
            // Verify date ordering is maintained
            expect(recalculatedSchedule.planningStartDate.getTime())
              .toBeLessThan(recalculatedSchedule.hiringStartDate.getTime());
            expect(recalculatedSchedule.hiringStartDate.getTime())
              .toBeLessThan(recalculatedSchedule.productionStartDate.getTime());
            expect(recalculatedSchedule.productionStartDate.getTime())
              .toBeLessThan(recalculatedSchedule.sealDate.getTime());
            expect(recalculatedSchedule.sealDate.getTime())
              .toBeLessThan(recalculatedSchedule.launchDate.getTime());
          }
        ),
        { numRuns: 100 }
      );
    });
  });

});
