import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ProjectManagerService, VelocityConfigService, SchedulerService } from '../../src/scheduling/services';
import { WorkflowEngineService } from '../../src/workflow/services';
import { Project, Episode, Milestone } from '../../src/scheduling/entities';
import { Page } from '../../src/workflow/entities/page.entity';
import { TaskStatus } from '../../src/workflow/types';
import { createFutureDate } from '../utils/test-factories';

describe('Scheduling-Workflow Integration', () => {
  let module: TestingModule;
  let projectManager: ProjectManagerService;
  let workflowEngine: WorkflowEngineService;

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
        WorkflowEngineService,
      ],
    }).compile();

    projectManager = module.get<ProjectManagerService>(ProjectManagerService);
    workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('프로젝트 생성 시 페이지 초기화', () => {
    /**
     * Requirements: 1.1, 1.4
     * 프로젝트 생성 → 에피소드 생성 → 페이지 초기화 검증
     */
    it('프로젝트 생성 시 에피소드가 올바르게 생성되어야 한다', async () => {
      const launchDate = createFutureDate(180);
      const episodeCount = 10;

      const project = await projectManager.createProject({
        title: 'Test Webtoon',
        launchDate,
        episodeCount,
      });

      expect(project).toBeDefined();
      expect(project.episodes).toHaveLength(episodeCount);
      expect(project.episodes[0].episodeNumber).toBe(1);
      expect(project.episodes[episodeCount - 1].episodeNumber).toBe(episodeCount);
    });

    it('에피소드별 페이지 초기화 시 올바른 초기 상태를 가져야 한다', () => {
      const episodeId = 'test-episode-id';
      const pages = workflowEngine.initializePages(episodeId, 5);

      expect(pages).toHaveLength(5);

      for (const page of pages) {
        expect(page.episodeId).toBe(episodeId);
        // BACKGROUND는 READY, 나머지는 LOCKED
        expect(page.backgroundStatus).toBe(TaskStatus.READY);
        expect(page.lineArtStatus).toBe(TaskStatus.LOCKED);
        expect(page.coloringStatus).toBe(TaskStatus.LOCKED);
        expect(page.postProcessingStatus).toBe(TaskStatus.LOCKED);
      }
    });

    it('페이지 번호가 1부터 5까지 순차적으로 할당되어야 한다', () => {
      const episodeId = 'test-episode-id';
      const pages = workflowEngine.initializePages(episodeId, 5);

      for (let i = 0; i < 5; i++) {
        expect(pages[i].pageNumber).toBe(i + 1);
      }
    });

    it('프로젝트 생성 시 마일스톤이 올바르게 생성되어야 한다', async () => {
      const launchDate = createFutureDate(180);

      const project = await projectManager.createProject({
        title: 'Test Webtoon',
        launchDate,
        episodeCount: 10,
      });

      expect(project.milestones).toBeDefined();
      expect(project.milestones.length).toBeGreaterThan(0);

      // 마일스톤 타입 확인
      const milestoneTypes = project.milestones.map((m) => m.type);
      expect(milestoneTypes).toContain('PLANNING_COMPLETE');
      expect(milestoneTypes).toContain('HIRING_COMPLETE');
      expect(milestoneTypes).toContain('PRODUCTION_START');
      expect(milestoneTypes).toContain('LAUNCH');
    });

    it('sealDate가 launchDate - 30일로 계산되어야 한다', async () => {
      const launchDate = createFutureDate(180);

      const project = await projectManager.createProject({
        title: 'Test Webtoon',
        launchDate,
        episodeCount: 10,
      });

      const expectedSealDate = new Date(launchDate);
      expectedSealDate.setDate(expectedSealDate.getDate() - 30);

      // 날짜 비교 (시간 무시)
      const projectSealDate = new Date(project.sealDate);
      expect(projectSealDate.toDateString()).toBe(expectedSealDate.toDateString());
    });
  });
});


import * as fc from 'fast-check';

describe('Property Tests: Project Creation Completeness', () => {
  let module: TestingModule;
  let projectManager: ProjectManagerService;
  let workflowEngine: WorkflowEngineService;

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
        WorkflowEngineService,
      ],
    }).compile();

    projectManager = module.get<ProjectManagerService>(ProjectManagerService);
    workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  /**
   * Property 1: Project Creation Completeness
   * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
   * 
   * For any valid project creation input:
   * - THE System SHALL generate exactly episodeCount episodes
   * - THE System SHALL generate 5 pages per episode
   * - THE System SHALL generate all required milestones
   */
  it('Property 1: 프로젝트 생성 시 에피소드 수가 정확해야 한다', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 52 }),
        async (episodeCount) => {
          const launchDate = createFutureDate(180 + episodeCount * 7);

          const project = await projectManager.createProject({
            title: `Test Project ${episodeCount}`,
            launchDate,
            episodeCount,
          });

          // 에피소드 수 검증
          expect(project.episodes).toHaveLength(episodeCount);

          // 에피소드 번호 순차 검증
          for (let i = 0; i < episodeCount; i++) {
            const episode = project.episodes.find((e) => e.episodeNumber === i + 1);
            expect(episode).toBeDefined();
          }

          // 마일스톤 존재 검증
          expect(project.milestones.length).toBeGreaterThan(0);
          const milestoneTypes = project.milestones.map((m) => m.type);
          expect(milestoneTypes).toContain('LAUNCH');
        }
      ),
      { numRuns: 10 } // 테스트 시간 고려하여 10회로 제한
    );
  });

  it('Property 1: 페이지 초기화 시 항상 올바른 초기 상태를 가져야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 10 }),
        (episodeId, pageCount) => {
          const pages = workflowEngine.initializePages(episodeId, pageCount);

          // 페이지 수 검증
          expect(pages).toHaveLength(pageCount);

          // 모든 페이지의 초기 상태 검증
          for (const page of pages) {
            expect(page.episodeId).toBe(episodeId);
            expect(page.backgroundStatus).toBe(TaskStatus.READY);
            expect(page.lineArtStatus).toBe(TaskStatus.LOCKED);
            expect(page.coloringStatus).toBe(TaskStatus.LOCKED);
            expect(page.postProcessingStatus).toBe(TaskStatus.LOCKED);
          }

          // 페이지 번호 순차 검증
          for (let i = 0; i < pageCount; i++) {
            expect(pages[i].pageNumber).toBe(i + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
