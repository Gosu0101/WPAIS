import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { ProjectManagerService, VelocityConfigService, SchedulerService } from '../../src/scheduling/services';
import { WorkflowEngineService } from '../../src/workflow/services';
import { ProgressService, BufferStatusService } from '../../src/monitor/services';
import { Project, Episode, Milestone, EpisodeStatus } from '../../src/scheduling/entities';
import { Page } from '../../src/workflow/entities/page.entity';
import { TaskStatus, WORKFLOW_EVENTS } from '../../src/workflow/types';
import { createFutureDate } from '../utils/test-factories';
import { completeAllTasksForPage } from '../utils/test-helpers';

describe('E2E: Project Lifecycle', () => {
  let module: TestingModule;
  let projectManager: ProjectManagerService;
  let workflowEngine: WorkflowEngineService;
  let progressService: ProgressService;
  let bufferStatusService: BufferStatusService;
  let eventEmitter: EventEmitter2;
  let emittedEvents: { event: string; payload: unknown }[];

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
        ProgressService,
        BufferStatusService,
      ],
    }).compile();

    projectManager = module.get<ProjectManagerService>(ProjectManagerService);
    workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);
    progressService = module.get<ProgressService>(ProgressService);
    bufferStatusService = module.get<BufferStatusService>(BufferStatusService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    emittedEvents = [];
    eventEmitter.onAny((event, payload) => {
      emittedEvents.push({ event: event as string, payload });
    });
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('전체 프로젝트 라이프사이클', () => {
    /**
     * Requirements: 1.1, 2.1, 3.1, 4.1
     * 프로젝트 생성 → 작업 진행 → 에피소드 완료 → 모니터링 검증
     */
    it('프로젝트 생성부터 에피소드 완료까지 전체 플로우가 동작해야 한다', async () => {
      // 1. 프로젝트 생성
      const launchDate = createFutureDate(180);
      const project = await projectManager.createProject({
        title: 'My Webtoon',
        launchDate,
        episodeCount: 10,
      });

      expect(project).toBeDefined();
      expect(project.episodes).toHaveLength(10);
      expect(project.milestones.length).toBeGreaterThan(0);

      // 2. 스케줄 검증
      const expectedSealDate = new Date(launchDate);
      expectedSealDate.setDate(expectedSealDate.getDate() - 30);
      expect(new Date(project.sealDate).toDateString()).toBe(expectedSealDate.toDateString());

      // 3. 첫 번째 에피소드 페이지 초기화
      const episode1 = project.episodes.find((e) => e.episodeNumber === 1)!;
      const pages = workflowEngine.initializePages(episode1.id, 5);

      expect(pages).toHaveLength(5);
      expect(pages[0].backgroundStatus).toBe(TaskStatus.READY);

      // 4. 모든 페이지 작업 완료
      const completedPages = pages.map((page) =>
        completeAllTasksForPage(workflowEngine, page)
      );

      // 5. 에피소드 완료 확인
      const isCompleted = workflowEngine.isEpisodeCompleted(completedPages);
      expect(isCompleted).toBe(true);

      // 6. 에피소드 완료 이벤트 발행
      emittedEvents = [];
      workflowEngine.checkAndEmitEpisodeCompleted(episode1.id, completedPages);

      const completedEvents = emittedEvents.filter(
        (e) => e.event === WORKFLOW_EVENTS.EPISODE_COMPLETED
      );
      expect(completedEvents).toHaveLength(1);

      // 7. 진행률 검증
      const mockEpisodes = [{ ...episode1, status: EpisodeStatus.COMPLETED }] as Episode[];
      const progress = progressService.getProgress(project.id, mockEpisodes, completedPages);

      expect(progress.progressPercentage).toBe(100);
      expect(progress.completedTasks).toBe(20);
    });

    it('런칭일 변경 시 전체 일정이 재계산되어야 한다', async () => {
      // 1. 프로젝트 생성
      const originalLaunchDate = createFutureDate(180);
      const project = await projectManager.createProject({
        title: 'My Webtoon',
        launchDate: originalLaunchDate,
        episodeCount: 10,
      });

      const originalSealDate = new Date(project.sealDate);
      const originalMilestoneDates = project.milestones.map((m) => ({
        type: m.type,
        date: new Date(m.targetDate),
      }));

      // 2. 런칭일 변경 (2주 앞당김)
      const newLaunchDate = createFutureDate(166);
      const updatedProject = await projectManager.updateLaunchDate(
        project.id,
        newLaunchDate
      );

      // 3. sealDate 재계산 검증
      const newSealDate = new Date(updatedProject.sealDate);
      expect(newSealDate.getTime()).toBeLessThan(originalSealDate.getTime());

      // 4. 마일스톤 재계산 검증
      for (const milestone of updatedProject.milestones) {
        const original = originalMilestoneDates.find((m) => m.type === milestone.type);
        if (original) {
          expect(new Date(milestone.targetDate).getTime()).toBeLessThan(original.date.getTime());
        }
      }

      // 5. velocityConfig 보존 검증
      expect(updatedProject.velocityConfig).toEqual(project.velocityConfig);
    });
  });

  describe('다중 에피소드 병렬 작업', () => {
    /**
     * Requirements: 3.4, 4.2
     * 여러 에피소드 동시 작업 시나리오
     */
    it('여러 에피소드를 동시에 작업할 수 있어야 한다', async () => {
      // 1. 프로젝트 생성
      const project = await projectManager.createProject({
        title: 'My Webtoon',
        launchDate: createFutureDate(180),
        episodeCount: 10,
      });

      // 2. 에피소드 1, 2, 3 페이지 초기화
      const episode1 = project.episodes.find((e) => e.episodeNumber === 1)!;
      const episode2 = project.episodes.find((e) => e.episodeNumber === 2)!;
      const episode3 = project.episodes.find((e) => e.episodeNumber === 3)!;

      const pages1 = workflowEngine.initializePages(episode1.id, 5);
      const pages2 = workflowEngine.initializePages(episode2.id, 5);
      const pages3 = workflowEngine.initializePages(episode3.id, 5);

      // 3. 에피소드 1: 모두 완료
      const completedPages1 = pages1.map((page) =>
        completeAllTasksForPage(workflowEngine, page)
      );

      // 4. 에피소드 2: 절반 완료
      const partialPages2 = [
        completeAllTasksForPage(workflowEngine, pages2[0]),
        completeAllTasksForPage(workflowEngine, pages2[1]),
        pages2[2],
        pages2[3],
        pages2[4],
      ];

      // 5. 에피소드 3: 미완료
      const pages3Unchanged = pages3;

      // 6. 각 에피소드 완료 상태 검증
      expect(workflowEngine.isEpisodeCompleted(completedPages1)).toBe(true);
      expect(workflowEngine.isEpisodeCompleted(partialPages2)).toBe(false);
      expect(workflowEngine.isEpisodeCompleted(pages3Unchanged)).toBe(false);

      // 7. 전체 진행률 검증
      const allPages = [...completedPages1, ...partialPages2, ...pages3Unchanged];
      const mockEpisodes = [
        { ...episode1, status: EpisodeStatus.COMPLETED },
        { ...episode2, status: EpisodeStatus.IN_PROGRESS },
        { ...episode3, status: EpisodeStatus.PENDING },
      ] as Episode[];

      const progress = progressService.getProgress(project.id, mockEpisodes, allPages);

      // 에피소드 1: 20 완료, 에피소드 2: 8 완료, 에피소드 3: 0 완료 = 28/60
      expect(progress.completedTasks).toBe(28);
      expect(progress.totalTasks).toBe(60);
      expect(progress.progressPercentage).toBe(47); // Math.round(28/60 * 100)
    });

    it('버퍼 상태가 에피소드 완료에 따라 업데이트되어야 한다', async () => {
      // 1. 10개 에피소드 중 7개 완료 시뮬레이션
      const episodes: Episode[] = [];
      for (let i = 1; i <= 10; i++) {
        const episode = new Episode();
        episode.id = `episode-${i}`;
        episode.episodeNumber = i;
        episode.status = i <= 7 ? EpisodeStatus.COMPLETED : EpisodeStatus.PENDING;
        episode.projectId = 'project-1';
        episode.dueDate = new Date();
        episode.duration = 7;
        episode.isSealed = i <= 7;
        episode.createdAt = new Date();
        episode.updatedAt = new Date();
        episodes.push(episode);
      }

      // 2. 버퍼 상태 검증
      const bufferStatus = bufferStatusService.getBufferStatus(episodes);

      expect(bufferStatus.sealedEpisodes).toBe(7);
      expect(bufferStatus.reserveEpisodes).toBe(0);
      expect(bufferStatus.sealProgress).toBe(100);
      expect(bufferStatus.reserveProgress).toBe(0);
      expect(bufferStatus.isOnTrack).toBe(false); // 비축 미완료

      // 3. 10개 모두 완료 시
      for (let i = 8; i <= 10; i++) {
        episodes[i - 1].status = EpisodeStatus.COMPLETED;
      }

      const fullBufferStatus = bufferStatusService.getBufferStatus(episodes);

      expect(fullBufferStatus.sealedEpisodes).toBe(7);
      expect(fullBufferStatus.reserveEpisodes).toBe(3);
      expect(fullBufferStatus.isOnTrack).toBe(true);
    });
  });
});
