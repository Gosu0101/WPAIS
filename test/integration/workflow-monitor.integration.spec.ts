import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { WorkflowEngineService } from '../../src/workflow/services';
import { ProgressService, BufferStatusService } from '../../src/monitor/services';
import { Episode, EpisodeStatus } from '../../src/scheduling/entities';
import { TaskStatus, TaskType } from '../../src/workflow/types';
import { createTestPages, createCompletedPage } from '../utils/test-factories';
import { completeAllTasksForPage } from '../utils/test-helpers';
import * as fc from 'fast-check';

describe('Workflow-Monitor Integration', () => {
  let module: TestingModule;
  let workflowEngine: WorkflowEngineService;
  let progressService: ProgressService;
  let bufferStatusService: BufferStatusService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        WorkflowEngineService,
        ProgressService,
        BufferStatusService,
      ],
    }).compile();

    workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);
    progressService = module.get<ProgressService>(ProgressService);
    bufferStatusService = module.get<BufferStatusService>(BufferStatusService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('진행률 계산 정확성', () => {
    /**
     * Requirements: 4.1, 4.2
     * 작업 완료 시 진행률 업데이트 검증
     */
    it('작업 완료 시 진행률이 정확하게 업데이트되어야 한다', () => {
      const projectId = 'project-1';
      const episodeId = 'episode-1';
      const pages = createTestPages(episodeId, 5);

      // 초기 상태: 0% 진행률
      const episodes: Episode[] = [createMockEpisode(episodeId, 1)];
      let progress = progressService.getProgress(projectId, episodes, pages);
      expect(progress.progressPercentage).toBe(0);
      expect(progress.completedTasks).toBe(0);
      expect(progress.totalTasks).toBe(20);

      // 2개 페이지 완료 후: 40% 진행률
      const partiallyCompletedPages = [
        completeAllTasksForPage(workflowEngine, pages[0]),
        completeAllTasksForPage(workflowEngine, pages[1]),
        pages[2],
        pages[3],
        pages[4],
      ];

      progress = progressService.getProgress(projectId, episodes, partiallyCompletedPages);
      expect(progress.progressPercentage).toBe(40);
      expect(progress.completedTasks).toBe(8);
    });

    it('에피소드별 진행률 breakdown이 정확해야 한다', () => {
      const projectId = 'project-1';
      const episode1Id = 'episode-1';
      const episode2Id = 'episode-2';

      const pages1 = createTestPages(episode1Id, 5);
      const pages2 = createTestPages(episode2Id, 5);

      // 에피소드 1: 모두 완료, 에피소드 2: 미완료
      const completedPages1 = pages1.map((p) =>
        completeAllTasksForPage(workflowEngine, p)
      );

      const allPages = [...completedPages1, ...pages2];
      const episodes: Episode[] = [
        createMockEpisode(episode1Id, 1),
        createMockEpisode(episode2Id, 2),
      ];

      const progress = progressService.getProgress(projectId, episodes, allPages);

      expect(progress.episodeProgress).toHaveLength(2);
      expect(progress.episodeProgress[0].progressPercentage).toBe(100);
      expect(progress.episodeProgress[1].progressPercentage).toBe(0);
    });

    it('공정별 진행률 breakdown이 정확해야 한다', () => {
      const episodeId = 'episode-1';
      const pages = createTestPages(episodeId, 5);

      // 모든 페이지의 BACKGROUND만 완료
      const partialPages = pages.map((page) => {
        const updated = workflowEngine.startTask(page, TaskType.BACKGROUND);
        return workflowEngine.completeTask(updated, TaskType.BACKGROUND);
      });

      const stageProgress = progressService.getStageProgress(partialPages);

      expect(stageProgress).toHaveLength(4);

      const bgProgress = stageProgress.find((s) => s.stage === TaskType.BACKGROUND);
      expect(bgProgress?.progressPercentage).toBe(100);

      const lineArtProgress = stageProgress.find((s) => s.stage === TaskType.LINE_ART);
      expect(lineArtProgress?.progressPercentage).toBe(0);
    });
  });

  describe('버퍼 상태 업데이트', () => {
    /**
     * Requirements: 4.1
     * 에피소드 완료 시 버퍼 상태 변경 검증
     */
    it('에피소드 완료 시 버퍼 상태가 업데이트되어야 한다', () => {
      // 7개 봉인 에피소드 완료
      const episodes: Episode[] = [];
      for (let i = 1; i <= 10; i++) {
        episodes.push(
          createMockEpisode(`episode-${i}`, i, i <= 7 ? EpisodeStatus.COMPLETED : EpisodeStatus.PENDING)
        );
      }

      const bufferStatus = bufferStatusService.getBufferStatus(episodes);

      expect(bufferStatus.sealedEpisodes).toBe(7);
      expect(bufferStatus.reserveEpisodes).toBe(0);
      expect(bufferStatus.sealProgress).toBe(100);
      expect(bufferStatus.isOnTrack).toBe(false); // 비축 미완료
    });

    it('봉인/비축 에피소드가 올바르게 구분되어야 한다', () => {
      // 10개 에피소드 모두 완료
      const episodes: Episode[] = [];
      for (let i = 1; i <= 10; i++) {
        episodes.push(createMockEpisode(`episode-${i}`, i, EpisodeStatus.COMPLETED));
      }

      const bufferStatus = bufferStatusService.getBufferStatus(episodes);

      expect(bufferStatus.sealedEpisodes).toBe(7); // 1-7화
      expect(bufferStatus.reserveEpisodes).toBe(3); // 8-10화
      expect(bufferStatus.isOnTrack).toBe(true);
    });

    it('에피소드별 버퍼 상세 정보가 정확해야 한다', () => {
      const episodes: Episode[] = [];
      for (let i = 1; i <= 10; i++) {
        episodes.push(
          createMockEpisode(`episode-${i}`, i, i <= 5 ? EpisodeStatus.COMPLETED : EpisodeStatus.PENDING)
        );
      }

      const details = bufferStatusService.getEpisodeBufferDetails(episodes);

      expect(details).toHaveLength(10);

      // 1-5화: 완료 및 봉인 대상
      for (let i = 0; i < 5; i++) {
        expect(details[i].isCompleted).toBe(true);
        expect(details[i].isSealed).toBe(true);
        expect(details[i].isSealTarget).toBe(true);
      }

      // 6-7화: 미완료, 봉인 대상
      for (let i = 5; i < 7; i++) {
        expect(details[i].isCompleted).toBe(false);
        expect(details[i].isSealed).toBe(false);
        expect(details[i].isSealTarget).toBe(true);
      }

      // 8-10화: 비축 대상
      for (let i = 7; i < 10; i++) {
        expect(details[i].isSealTarget).toBe(false);
        expect(details[i].isReserveTarget).toBe(true);
      }
    });
  });
});

// 헬퍼 함수
function createMockEpisode(
  id: string,
  episodeNumber: number,
  status: EpisodeStatus = EpisodeStatus.PENDING
): Episode {
  const episode = new Episode();
  episode.id = id;
  episode.episodeNumber = episodeNumber;
  episode.status = status;
  episode.projectId = 'project-1';
  episode.dueDate = new Date();
  episode.duration = 7;
  episode.isSealed = episodeNumber <= 7;
  episode.createdAt = new Date();
  episode.updatedAt = new Date();
  return episode;
}


describe('Property Tests: Monitor Data Accuracy', () => {
  let module: TestingModule;
  let workflowEngine: WorkflowEngineService;
  let progressService: ProgressService;
  let bufferStatusService: BufferStatusService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        WorkflowEngineService,
        ProgressService,
        BufferStatusService,
      ],
    }).compile();

    workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);
    progressService = module.get<ProgressService>(ProgressService);
    bufferStatusService = module.get<BufferStatusService>(BufferStatusService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  /**
   * Property 4: Monitor Data Accuracy
   * **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
   * 
   * For any project state:
   * - Buffer status SHALL accurately reflect sealed vs completed episodes
   * - Progress percentage SHALL be within [0, 100]
   */
  it('Property 4: 진행률은 항상 0-100 범위여야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 0, max: 5 }),
        (projectId, episodeCount, completedPageCount) => {
          const episodes: Episode[] = [];
          const allPages: any[] = [];

          for (let i = 1; i <= episodeCount; i++) {
            const episodeId = `episode-${i}`;
            episodes.push(createMockEpisode(episodeId, i));

            const pages = createTestPages(episodeId, 5);
            const processedPages = pages.map((page, index) => {
              if (index < completedPageCount) {
                return completeAllTasksForPage(workflowEngine, page);
              }
              return page;
            });
            allPages.push(...processedPages);
          }

          const progress = progressService.getProgress(projectId, episodes, allPages);

          expect(progress.progressPercentage).toBeGreaterThanOrEqual(0);
          expect(progress.progressPercentage).toBeLessThanOrEqual(100);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 4: 버퍼 상태가 완료된 에피소드를 정확히 반영해야 한다', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 10, maxLength: 10 }),
        (completionFlags) => {
          const episodes: Episode[] = completionFlags.map((isCompleted, index) =>
            createMockEpisode(
              `episode-${index + 1}`,
              index + 1,
              isCompleted ? EpisodeStatus.COMPLETED : EpisodeStatus.PENDING
            )
          );

          const bufferStatus = bufferStatusService.getBufferStatus(episodes);

          // 봉인 에피소드 수 검증 (1-7화 중 완료된 것)
          const expectedSealed = completionFlags
            .slice(0, 7)
            .filter((f) => f).length;
          expect(bufferStatus.sealedEpisodes).toBe(expectedSealed);

          // 비축 에피소드 수 검증 (8-10화 중 완료된 것)
          const expectedReserve = completionFlags
            .slice(7, 10)
            .filter((f) => f).length;
          expect(bufferStatus.reserveEpisodes).toBe(expectedReserve);

          // 전체 완료 수 검증
          const expectedTotal = completionFlags.filter((f) => f).length;
          expect(bufferStatus.totalCompleted).toBe(expectedTotal);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 4: 공정별 진행률 합이 전체 진행률과 일치해야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 0, max: 5 }),
        (episodeId, completedPageCount) => {
          const pages = createTestPages(episodeId, 5);

          const processedPages = pages.map((page, index) => {
            if (index < completedPageCount) {
              return completeAllTasksForPage(workflowEngine, page);
            }
            return page;
          });

          const stageProgress = progressService.getStageProgress(processedPages);

          // 각 공정별 완료 작업 수의 합
          const totalCompletedFromStages = stageProgress.reduce(
            (sum, stage) => sum + stage.completedTasks,
            0
          );

          // 전체 완료 작업 수
          const expectedCompleted = completedPageCount * 4;

          expect(totalCompletedFromStages).toBe(expectedCompleted);
        }
      ),
      { numRuns: 50 }
    );
  });
});
