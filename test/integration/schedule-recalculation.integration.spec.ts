import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ProjectManagerService, VelocityConfigService, SchedulerService } from '../../src/scheduling/services';
import { Project, Episode, Milestone } from '../../src/scheduling/entities';
import { Page } from '../../src/workflow/entities/page.entity';
import { createFutureDate } from '../utils/test-factories';
import * as fc from 'fast-check';

describe('Schedule Recalculation Integration', () => {
  let module: TestingModule;
  let projectManager: ProjectManagerService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Project, Episode, Milestone, Page],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([Project, Episode, Milestone, Page]),
        EventEmitterModule.forRoot(),
      ],
      providers: [
        {
          provide: VelocityConfigService,
          useFactory: () => new VelocityConfigService(),
        },
        SchedulerService,
        ProjectManagerService,
      ],
    }).compile();

    projectManager = module.get<ProjectManagerService>(ProjectManagerService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('스케줄 재계산', () => {
    /**
     * Requirements: 5.1, 5.2, 5.3
     * 런칭일 변경 → 전체 일정 재계산 검증
     */
    it('런칭일 변경 시 sealDate가 재계산되어야 한다', async () => {
      const originalLaunchDate = createFutureDate(180);
      const project = await projectManager.createProject({
        title: 'Test Project',
        launchDate: originalLaunchDate,
        episodeCount: 10,
      });

      const originalSealDate = new Date(project.sealDate);

      // 런칭일 2주 앞당김
      const newLaunchDate = createFutureDate(166);
      const updatedProject = await projectManager.updateLaunchDate(
        project.id,
        newLaunchDate
      );

      const newSealDate = new Date(updatedProject.sealDate);
      const expectedSealDate = new Date(newLaunchDate);
      expectedSealDate.setDate(expectedSealDate.getDate() - 30);

      expect(newSealDate.toDateString()).toBe(expectedSealDate.toDateString());
      expect(newSealDate.getTime()).toBeLessThan(originalSealDate.getTime());
    });

    it('런칭일 변경 시 에피소드 마감일이 재계산되어야 한다', async () => {
      const originalLaunchDate = createFutureDate(180);
      const project = await projectManager.createProject({
        title: 'Test Project',
        launchDate: originalLaunchDate,
        episodeCount: 10,
      });

      const originalDueDates = project.episodes.map((e) => new Date(e.dueDate));

      // 런칭일 2주 앞당김
      const newLaunchDate = createFutureDate(166);
      const updatedProject = await projectManager.updateLaunchDate(
        project.id,
        newLaunchDate
      );

      // 모든 에피소드 마감일이 변경되었는지 확인
      for (let i = 0; i < updatedProject.episodes.length; i++) {
        const newDueDate = new Date(updatedProject.episodes[i].dueDate);
        expect(newDueDate.getTime()).toBeLessThan(originalDueDates[i].getTime());
      }
    });

    it('런칭일 변경 시 velocityConfig가 보존되어야 한다', async () => {
      const customVelocityConfig = {
        learningPeriodEnd: 15,
        learningPeriodDuration: 21,
        normalPeriodDuration: 10,
      };

      const project = await projectManager.createProject({
        title: 'Test Project',
        launchDate: createFutureDate(180),
        episodeCount: 10,
        velocityConfig: customVelocityConfig,
      });

      const newLaunchDate = createFutureDate(200);
      const updatedProject = await projectManager.updateLaunchDate(
        project.id,
        newLaunchDate
      );

      expect(updatedProject.velocityConfig).toEqual(customVelocityConfig);
    });
  });

  describe('마일스톤 재계산', () => {
    /**
     * Requirements: 5.3
     * 런칭일 변경 → 마일스톤 날짜 재계산 검증
     */
    it('런칭일 변경 시 마일스톤 날짜가 재계산되어야 한다', async () => {
      const originalLaunchDate = createFutureDate(180);
      const project = await projectManager.createProject({
        title: 'Test Project',
        launchDate: originalLaunchDate,
        episodeCount: 10,
      });

      const originalMilestoneDates = project.milestones.map((m) => ({
        type: m.type,
        date: new Date(m.targetDate),
      }));

      // 런칭일 2주 앞당김
      const newLaunchDate = createFutureDate(166);
      const updatedProject = await projectManager.updateLaunchDate(
        project.id,
        newLaunchDate
      );

      // 모든 마일스톤 날짜가 변경되었는지 확인
      for (const milestone of updatedProject.milestones) {
        const original = originalMilestoneDates.find((m) => m.type === milestone.type);
        if (original) {
          const newDate = new Date(milestone.targetDate);
          expect(newDate.getTime()).toBeLessThan(original.date.getTime());
        }
      }
    });

    it('LAUNCH 마일스톤이 새 런칭일과 일치해야 한다', async () => {
      const project = await projectManager.createProject({
        title: 'Test Project',
        launchDate: createFutureDate(180),
        episodeCount: 10,
      });

      const newLaunchDate = createFutureDate(200);
      const updatedProject = await projectManager.updateLaunchDate(
        project.id,
        newLaunchDate
      );

      const launchMilestone = updatedProject.milestones.find(
        (m) => m.type === 'LAUNCH'
      );

      expect(launchMilestone).toBeDefined();
      expect(new Date(launchMilestone!.targetDate).toDateString()).toBe(
        newLaunchDate.toDateString()
      );
    });
  });
});


describe('Property Tests: Schedule Recalculation Consistency', () => {
  let module: TestingModule;
  let projectManager: ProjectManagerService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Project, Episode, Milestone, Page],
          synchronize: true,
          dropSchema: true,
        }),
        TypeOrmModule.forFeature([Project, Episode, Milestone, Page]),
        EventEmitterModule.forRoot(),
      ],
      providers: [
        {
          provide: VelocityConfigService,
          useFactory: () => new VelocityConfigService(),
        },
        SchedulerService,
        ProjectManagerService,
      ],
    }).compile();

    projectManager = module.get<ProjectManagerService>(ProjectManagerService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  /**
   * Property 5: Schedule Recalculation Consistency
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   * 
   * For any launch date change:
   * - sealDate SHALL equal newLaunchDate - 30 days
   * - All episode due dates SHALL be recalculated
   * - All milestone dates SHALL be recalculated
   * - velocityConfig SHALL be preserved
   */
  it('Property 5: sealDate는 항상 launchDate - 30일이어야 한다', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 90, max: 365 }),
        fc.integer({ min: -30, max: 30 }),
        async (initialDays, daysDelta) => {
          const initialLaunchDate = createFutureDate(initialDays);
          const project = await projectManager.createProject({
            title: 'Test Project',
            launchDate: initialLaunchDate,
            episodeCount: 10,
          });

          // 런칭일 변경
          const newLaunchDate = createFutureDate(initialDays + daysDelta);
          const updatedProject = await projectManager.updateLaunchDate(
            project.id,
            newLaunchDate
          );

          // sealDate = launchDate - 30일 검증
          const expectedSealDate = new Date(newLaunchDate);
          expectedSealDate.setDate(expectedSealDate.getDate() - 30);

          const actualSealDate = new Date(updatedProject.sealDate);
          expect(actualSealDate.toDateString()).toBe(expectedSealDate.toDateString());
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 5: velocityConfig는 런칭일 변경 후에도 보존되어야 한다', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 20 }),
        fc.integer({ min: 7, max: 28 }),
        fc.integer({ min: 5, max: 14 }),
        async (learningEnd, learningDuration, normalDuration) => {
          const customConfig = {
            learningPeriodEnd: learningEnd,
            learningPeriodDuration: learningDuration,
            normalPeriodDuration: normalDuration,
          };

          const project = await projectManager.createProject({
            title: 'Test Project',
            launchDate: createFutureDate(180),
            episodeCount: 10,
            velocityConfig: customConfig,
          });

          const newLaunchDate = createFutureDate(200);
          const updatedProject = await projectManager.updateLaunchDate(
            project.id,
            newLaunchDate
          );

          expect(updatedProject.velocityConfig).toEqual(customConfig);
        }
      ),
      { numRuns: 10 }
    );
  });

  it('Property 5: 에피소드 수는 런칭일 변경 후에도 유지되어야 한다', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 52 }),
        async (episodeCount) => {
          const project = await projectManager.createProject({
            title: 'Test Project',
            launchDate: createFutureDate(180),
            episodeCount,
          });

          const newLaunchDate = createFutureDate(200);
          const updatedProject = await projectManager.updateLaunchDate(
            project.id,
            newLaunchDate
          );

          expect(updatedProject.episodes).toHaveLength(episodeCount);
        }
      ),
      { numRuns: 10 }
    );
  });
});
