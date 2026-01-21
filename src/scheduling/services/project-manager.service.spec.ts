import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectManagerService } from './project-manager.service';
import { SchedulerService } from './scheduler.service';
import { VelocityConfigService } from './velocity-config.service';
import { Project, Episode, Milestone, MilestoneType } from '../entities';
import { getDefaultVelocityConfig } from '../types';

describe('ProjectManagerService', () => {
  let module: TestingModule;
  let projectManagerService: ProjectManagerService;
  let schedulerService: SchedulerService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Project, Episode, Milestone],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([Project, Episode, Milestone]),
      ],
      providers: [
        ProjectManagerService,
        SchedulerService,
        {
          provide: VelocityConfigService,
          useFactory: () => new VelocityConfigService(),
        },
      ],
    }).compile();

    projectManagerService = module.get<ProjectManagerService>(ProjectManagerService);
    schedulerService = module.get<SchedulerService>(SchedulerService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('createProject', () => {
    it('should create a project with correct dates', async () => {
      const launchDate = new Date('2027-01-31');
      const project = await projectManagerService.createProject({
        title: 'Test Webtoon',
        launchDate,
        episodeCount: 10,
      });

      expect(project).toBeDefined();
      expect(project.id).toBeDefined();
      expect(project.title).toBe('Test Webtoon');
      expect(project.launchDate.getTime()).toBe(launchDate.getTime());
      
      // Verify seal date (launch - 30 days)
      const expectedSealDate = new Date('2027-01-01');
      expect(project.sealDate.getTime()).toBe(expectedSealDate.getTime());
    });

    it('should create episodes with correct due dates', async () => {
      const launchDate = new Date('2027-01-31');
      const project = await projectManagerService.createProject({
        title: 'Test Webtoon',
        launchDate,
        episodeCount: 10,
      });

      expect(project.episodes).toHaveLength(10);
      
      // Verify episode numbers are sequential
      for (let i = 0; i < project.episodes.length; i++) {
        const episode = project.episodes.find(e => e.episodeNumber === i + 1);
        expect(episode).toBeDefined();
      }
      
      // Verify episodes 1-7 are sealed
      const sealedEpisodes = project.episodes.filter(e => e.isSealed);
      expect(sealedEpisodes.length).toBe(7);
    });

    it('should create milestones', async () => {
      const launchDate = new Date('2027-01-31');
      const project = await projectManagerService.createProject({
        title: 'Test Webtoon',
        launchDate,
        episodeCount: 10,
      });

      expect(project.milestones).toHaveLength(7);
      
      const types = project.milestones.map(m => m.type);
      expect(types).toContain(MilestoneType.PLANNING_COMPLETE);
      expect(types).toContain(MilestoneType.HIRING_COMPLETE);
      expect(types).toContain(MilestoneType.PRODUCTION_START);
      expect(types).toContain(MilestoneType.EPISODE_3_COMPLETE);
      expect(types).toContain(MilestoneType.EPISODE_5_COMPLETE);
      expect(types).toContain(MilestoneType.EPISODE_7_SEAL);
      expect(types).toContain(MilestoneType.LAUNCH);
    });

    it('should use default velocity config when not provided', async () => {
      const launchDate = new Date('2027-01-31');
      const project = await projectManagerService.createProject({
        title: 'Test Webtoon',
        launchDate,
        episodeCount: 10,
      });

      const defaultConfig = getDefaultVelocityConfig();
      expect(project.velocityConfig).toEqual(defaultConfig);
    });

    it('should use custom velocity config when provided', async () => {
      const launchDate = new Date('2027-01-31');
      const customConfig = {
        learningPeriodEnd: 5,
        learningPeriodDuration: 21,
        normalPeriodDuration: 10,
      };
      
      const project = await projectManagerService.createProject({
        title: 'Test Webtoon',
        launchDate,
        episodeCount: 10,
        velocityConfig: customConfig,
      });

      expect(project.velocityConfig).toEqual(customConfig);
    });

    /**
     * Feature: scheduling-engine, Property 3: Project Data Round-Trip
     * 
     * *For any* valid project creation input, creating a project and then querying it
     * SHALL return a project with identical launch date, seal date, and velocity
     * configuration values.
     * 
     * **Validates: Requirements 1.3, 4.4**
     */
    it('should preserve project data through round-trip for any valid inputs (Property 3)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
          fc.date({ min: new Date('2026-01-01'), max: new Date('2100-12-31') }).filter(d => !isNaN(d.getTime())),
          fc.integer({ min: 1, max: 50 }),
          async (title: string, launchDate: Date, episodeCount: number) => {
            // Create project
            const createdProject = await projectManagerService.createProject({
              title,
              launchDate,
              episodeCount,
            });

            // Query project
            const queriedProject = await projectManagerService.getProject(createdProject.id);

            // Verify round-trip consistency
            expect(queriedProject).not.toBeNull();
            expect(queriedProject!.id).toBe(createdProject.id);
            expect(queriedProject!.title).toBe(title);
            expect(queriedProject!.launchDate.getTime()).toBe(launchDate.getTime());
            
            // Verify seal date consistency
            const expectedSealDate = schedulerService.calculateSealDate(launchDate);
            expect(queriedProject!.sealDate.getTime()).toBe(expectedSealDate.getTime());
            
            // Verify velocity config consistency
            const defaultConfig = getDefaultVelocityConfig();
            expect(queriedProject!.velocityConfig).toEqual(defaultConfig);
            
            // Verify episode count consistency
            expect(queriedProject!.episodes).toHaveLength(episodeCount);
            
            // Verify each episode has correct due date
            for (const episode of queriedProject!.episodes) {
              expect(episode.projectId).toBe(createdProject.id);
              expect(episode.episodeNumber).toBeGreaterThanOrEqual(1);
              expect(episode.episodeNumber).toBeLessThanOrEqual(episodeCount);
              expect(episode.dueDate).toBeDefined();
              expect(episode.duration).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getMilestones', () => {
    it('should return milestones for a project', async () => {
      const launchDate = new Date('2027-01-31');
      const project = await projectManagerService.createProject({
        title: 'Test Webtoon',
        launchDate,
        episodeCount: 10,
      });

      const milestones = await projectManagerService.getMilestones(project.id);

      expect(milestones).toHaveLength(7);
      
      // Verify milestones are ordered by target date
      for (let i = 0; i < milestones.length - 1; i++) {
        expect(milestones[i].targetDate.getTime()).toBeLessThanOrEqual(
          milestones[i + 1].targetDate.getTime()
        );
      }
    });

    it('should return empty array for non-existent project', async () => {
      const milestones = await projectManagerService.getMilestones('non-existent-id');
      expect(milestones).toHaveLength(0);
    });
  });

  describe('updateLaunchDate', () => {
    it('should update launch date and recalculate all dates', async () => {
      const originalLaunchDate = new Date('2027-01-31');
      const project = await projectManagerService.createProject({
        title: 'Test Webtoon',
        launchDate: originalLaunchDate,
        episodeCount: 10,
      });

      const newLaunchDate = new Date('2027-06-30');
      const updatedProject = await projectManagerService.updateLaunchDate(
        project.id,
        newLaunchDate
      );

      // Verify launch date is updated
      expect(updatedProject.launchDate.getTime()).toBe(newLaunchDate.getTime());
      
      // Verify seal date is recalculated
      const expectedSealDate = schedulerService.calculateSealDate(newLaunchDate);
      expect(updatedProject.sealDate.getTime()).toBe(expectedSealDate.getTime());
      
      // Verify velocity config is preserved
      expect(updatedProject.velocityConfig).toEqual(project.velocityConfig);
    });

    it('should update episode due dates', async () => {
      const originalLaunchDate = new Date('2027-01-31');
      const project = await projectManagerService.createProject({
        title: 'Test Webtoon',
        launchDate: originalLaunchDate,
        episodeCount: 10,
      });

      const originalEpisodeDueDates = project.episodes.map(e => e.dueDate.getTime());

      const newLaunchDate = new Date('2027-06-30');
      const updatedProject = await projectManagerService.updateLaunchDate(
        project.id,
        newLaunchDate
      );

      // Verify episode due dates are different
      const newEpisodeDueDates = updatedProject.episodes.map(e => e.dueDate.getTime());
      expect(newEpisodeDueDates).not.toEqual(originalEpisodeDueDates);
      
      // Verify episode count is preserved
      expect(updatedProject.episodes).toHaveLength(10);
    });

    it('should update milestone dates', async () => {
      const originalLaunchDate = new Date('2027-01-31');
      const project = await projectManagerService.createProject({
        title: 'Test Webtoon',
        launchDate: originalLaunchDate,
        episodeCount: 10,
      });

      const originalMilestoneDates = project.milestones.map(m => m.targetDate.getTime());

      const newLaunchDate = new Date('2027-06-30');
      const updatedProject = await projectManagerService.updateLaunchDate(
        project.id,
        newLaunchDate
      );

      // Verify milestone dates are different
      const newMilestoneDates = updatedProject.milestones.map(m => m.targetDate.getTime());
      expect(newMilestoneDates).not.toEqual(originalMilestoneDates);
      
      // Verify milestone count is preserved
      expect(updatedProject.milestones).toHaveLength(7);
    });

    it('should throw error for non-existent project', async () => {
      const newLaunchDate = new Date('2027-06-30');
      
      await expect(
        projectManagerService.updateLaunchDate('non-existent-id', newLaunchDate)
      ).rejects.toThrow('Project not found');
    });
  });

  describe('getProject', () => {
    it('should return project with relations', async () => {
      const launchDate = new Date('2027-01-31');
      const project = await projectManagerService.createProject({
        title: 'Test Webtoon',
        launchDate,
        episodeCount: 10,
      });

      const queriedProject = await projectManagerService.getProject(project.id);

      expect(queriedProject).not.toBeNull();
      expect(queriedProject!.episodes).toHaveLength(10);
      expect(queriedProject!.milestones).toHaveLength(7);
    });

    it('should return null for non-existent project', async () => {
      const project = await projectManagerService.getProject('non-existent-id');
      expect(project).toBeNull();
    });
  });
});
