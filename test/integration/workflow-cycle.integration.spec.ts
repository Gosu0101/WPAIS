import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { WorkflowEngineService } from '../../src/workflow/services';
import { TaskStatus, TaskType, WORKFLOW_EVENTS } from '../../src/workflow/types';
import { InvalidStateTransitionError, LockedException } from '../../src/workflow/errors';
import { createTestPage, createTestPages } from '../utils/test-factories';
import { completeAllTasksForPage, completeTasksUpTo } from '../utils/test-helpers';
import * as fc from 'fast-check';

describe('Workflow Cycle Integration', () => {
  let module: TestingModule;
  let workflowEngine: WorkflowEngineService;
  let eventEmitter: EventEmitter2;
  let emittedEvents: { event: string; payload: unknown }[];

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [WorkflowEngineService],
    }).compile();

    workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);

    // 이벤트 캡처
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

  describe('단일 페이지 워크플로우 완료', () => {
    /**
     * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
     * BACKGROUND → LINE_ART → COLORING → POST_PROCESSING 순차 완료
     */
    it('BACKGROUND 완료 시 LINE_ART가 READY로 변경되어야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // BACKGROUND 시작
      let updatedPage = workflowEngine.startTask(page, TaskType.BACKGROUND);
      expect(updatedPage.backgroundStatus).toBe(TaskStatus.IN_PROGRESS);

      // BACKGROUND 완료
      updatedPage = workflowEngine.completeTask(updatedPage, TaskType.BACKGROUND);
      expect(updatedPage.backgroundStatus).toBe(TaskStatus.DONE);
      expect(updatedPage.lineArtStatus).toBe(TaskStatus.READY);
    });

    it('LINE_ART 완료 시 COLORING이 READY로 변경되어야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // BACKGROUND 완료
      let updatedPage = completeTasksUpTo(workflowEngine, page, TaskType.BACKGROUND);

      // LINE_ART 시작 및 완료
      updatedPage = workflowEngine.startTask(updatedPage, TaskType.LINE_ART);
      expect(updatedPage.lineArtStatus).toBe(TaskStatus.IN_PROGRESS);

      updatedPage = workflowEngine.completeTask(updatedPage, TaskType.LINE_ART);
      expect(updatedPage.lineArtStatus).toBe(TaskStatus.DONE);
      expect(updatedPage.coloringStatus).toBe(TaskStatus.READY);
    });

    it('COLORING 완료 시 POST_PROCESSING이 READY로 변경되어야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // LINE_ART까지 완료
      let updatedPage = completeTasksUpTo(workflowEngine, page, TaskType.LINE_ART);

      // COLORING 시작 및 완료
      updatedPage = workflowEngine.startTask(updatedPage, TaskType.COLORING);
      expect(updatedPage.coloringStatus).toBe(TaskStatus.IN_PROGRESS);

      updatedPage = workflowEngine.completeTask(updatedPage, TaskType.COLORING);
      expect(updatedPage.coloringStatus).toBe(TaskStatus.DONE);
      expect(updatedPage.postProcessingStatus).toBe(TaskStatus.READY);
    });

    it('POST_PROCESSING 완료 시 페이지가 완전히 완료되어야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // 모든 작업 완료
      const completedPage = completeAllTasksForPage(workflowEngine, page);

      expect(completedPage.backgroundStatus).toBe(TaskStatus.DONE);
      expect(completedPage.lineArtStatus).toBe(TaskStatus.DONE);
      expect(completedPage.coloringStatus).toBe(TaskStatus.DONE);
      expect(completedPage.postProcessingStatus).toBe(TaskStatus.DONE);
    });

    it('작업 완료 시 TaskUnlockedEvent가 발행되어야 한다', () => {
      const page = createTestPage('episode-1', 1);

      // BACKGROUND 완료
      let updatedPage = workflowEngine.startTask(page, TaskType.BACKGROUND);
      updatedPage = workflowEngine.completeTask(updatedPage, TaskType.BACKGROUND);

      // TaskUnlockedEvent 확인
      const unlockedEvents = emittedEvents.filter(
        (e) => e.event === WORKFLOW_EVENTS.TASK_UNLOCKED
      );
      expect(unlockedEvents.length).toBeGreaterThan(0);
      expect(unlockedEvents[0].payload).toMatchObject({
        taskType: TaskType.LINE_ART,
      });
    });
  });
});


describe('Property Tests: Workflow State Consistency', () => {
  let module: TestingModule;
  let workflowEngine: WorkflowEngineService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [WorkflowEngineService],
    }).compile();

    workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  /**
   * Property 2: Workflow State Consistency
   * **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
   * 
   * For any page at any point in time:
   * - IF BACKGROUND is not DONE, THEN LINE_ART SHALL be LOCKED
   * - IF LINE_ART is not DONE, THEN COLORING SHALL be LOCKED
   * - IF COLORING is not DONE, THEN POST_PROCESSING SHALL be LOCKED
   */
  it('Property 2: BACKGROUND가 DONE이 아니면 LINE_ART는 LOCKED여야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }),
        (episodeId, pageNumber) => {
          const page = createTestPage(episodeId, pageNumber);

          // 초기 상태에서 BACKGROUND는 READY, LINE_ART는 LOCKED
          expect(page.backgroundStatus).toBe(TaskStatus.READY);
          expect(page.lineArtStatus).toBe(TaskStatus.LOCKED);

          // BACKGROUND 시작 후에도 LINE_ART는 LOCKED
          const inProgressPage = workflowEngine.startTask(page, TaskType.BACKGROUND);
          expect(inProgressPage.backgroundStatus).toBe(TaskStatus.IN_PROGRESS);
          expect(inProgressPage.lineArtStatus).toBe(TaskStatus.LOCKED);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: 의존성 체인이 항상 유지되어야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 0, max: 3 }), // 완료할 작업 수 (0-3)
        (episodeId, pageNumber, completedTaskCount) => {
          const page = createTestPage(episodeId, pageNumber);
          const taskOrder = [
            TaskType.BACKGROUND,
            TaskType.LINE_ART,
            TaskType.COLORING,
            TaskType.POST_PROCESSING,
          ];

          let currentPage = page;

          // 지정된 수만큼 작업 완료
          for (let i = 0; i < completedTaskCount; i++) {
            currentPage = workflowEngine.startTask(currentPage, taskOrder[i]);
            currentPage = workflowEngine.completeTask(currentPage, taskOrder[i]);
          }

          // 완료된 작업 이후의 첫 번째 작업은 READY 또는 LOCKED
          // 그 이후 작업들은 모두 LOCKED
          for (let i = completedTaskCount + 1; i < 4; i++) {
            const status = getTaskStatus(currentPage, taskOrder[i]);
            expect(status).toBe(TaskStatus.LOCKED);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('Property 2: 잘못된 순서로 작업 시작 시 에러가 발생해야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom(TaskType.LINE_ART, TaskType.COLORING, TaskType.POST_PROCESSING),
        (episodeId, taskType) => {
          const page = createTestPage(episodeId, 1);

          // 선행 작업 없이 시작 시도
          expect(() => {
            workflowEngine.startTask(page, taskType);
          }).toThrow();
        }
      ),
      { numRuns: 50 }
    );
  });
});

// 헬퍼 함수
function getTaskStatus(page: any, taskType: TaskType): TaskStatus {
  switch (taskType) {
    case TaskType.BACKGROUND:
      return page.backgroundStatus;
    case TaskType.LINE_ART:
      return page.lineArtStatus;
    case TaskType.COLORING:
      return page.coloringStatus;
    case TaskType.POST_PROCESSING:
      return page.postProcessingStatus;
  }
}


describe('에피소드 완료 테스트', () => {
  let module: TestingModule;
  let workflowEngine: WorkflowEngineService;
  let eventEmitter: EventEmitter2;
  let emittedEvents: { event: string; payload: unknown }[];

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [WorkflowEngineService],
    }).compile();

    workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);
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

  /**
   * Requirements: 3.1, 3.2
   * 5개 페이지 모두 완료 시 에피소드 완료 검증
   */
  it('모든 페이지 완료 시 에피소드가 완료되어야 한다', () => {
    const episodeId = 'episode-1';
    const pages = createTestPages(episodeId, 5);

    // 모든 페이지 완료
    const completedPages = pages.map((page) =>
      completeAllTasksForPage(workflowEngine, page)
    );

    // 에피소드 완료 확인
    const isCompleted = workflowEngine.isEpisodeCompleted(completedPages);
    expect(isCompleted).toBe(true);
  });

  it('일부 페이지만 완료 시 에피소드가 완료되지 않아야 한다', () => {
    const episodeId = 'episode-1';
    const pages = createTestPages(episodeId, 5);

    // 4개 페이지만 완료
    const completedPages = pages.slice(0, 4).map((page) =>
      completeAllTasksForPage(workflowEngine, page)
    );
    completedPages.push(pages[4]); // 마지막 페이지는 미완료

    const isCompleted = workflowEngine.isEpisodeCompleted(completedPages);
    expect(isCompleted).toBe(false);
  });

  it('에피소드 완료 시 EpisodeCompletedEvent가 발행되어야 한다', () => {
    const episodeId = 'episode-1';
    const pages = createTestPages(episodeId, 5);

    // 모든 페이지 완료
    const completedPages = pages.map((page) =>
      completeAllTasksForPage(workflowEngine, page)
    );

    // 에피소드 완료 체크 및 이벤트 발행
    const wasCompleted = workflowEngine.checkAndEmitEpisodeCompleted(
      episodeId,
      completedPages
    );

    expect(wasCompleted).toBe(true);

    // EpisodeCompletedEvent 확인
    const completedEvents = emittedEvents.filter(
      (e) => e.event === WORKFLOW_EVENTS.EPISODE_COMPLETED
    );
    expect(completedEvents.length).toBe(1);
    expect(completedEvents[0].payload).toMatchObject({
      episodeId,
    });
  });

  it('에피소드 진행률이 정확하게 계산되어야 한다', () => {
    const episodeId = 'episode-1';
    const pages = createTestPages(episodeId, 5);

    // 2개 페이지 완료 (8개 작업 완료)
    const partiallyCompletedPages = [
      completeAllTasksForPage(workflowEngine, pages[0]),
      completeAllTasksForPage(workflowEngine, pages[1]),
      pages[2],
      pages[3],
      pages[4],
    ];

    const progress = workflowEngine.calculateEpisodeProgress(
      episodeId,
      partiallyCompletedPages
    );

    expect(progress.totalTasks).toBe(20); // 5 pages × 4 tasks
    expect(progress.completedTasks).toBe(8); // 2 pages × 4 tasks
    expect(progress.percentage).toBe(40); // 8/20 × 100
  });
});


describe('Property Tests: Episode Completion Consistency', () => {
  let module: TestingModule;
  let workflowEngine: WorkflowEngineService;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [WorkflowEngineService],
    }).compile();

    workflowEngine = module.get<WorkflowEngineService>(WorkflowEngineService);
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  /**
   * Property 3: Episode Completion Consistency
   * **Validates: Requirements 3.1, 3.2, 3.3, 3.4**
   * 
   * For any episode:
   * - Episode is COMPLETED IFF all 20 tasks (5 pages × 4 tasks) are DONE
   * - Progress percentage SHALL equal (completedTasks / 20) × 100
   */
  it('Property 3: 에피소드 완료는 모든 작업 완료와 동치여야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.array(fc.boolean(), { minLength: 5, maxLength: 5 }),
        (episodeId, pageCompletionFlags) => {
          const pages = createTestPages(episodeId, 5);

          // 플래그에 따라 페이지 완료
          const processedPages = pages.map((page, index) => {
            if (pageCompletionFlags[index]) {
              return completeAllTasksForPage(workflowEngine, page);
            }
            return page;
          });

          const isCompleted = workflowEngine.isEpisodeCompleted(processedPages);
          const allPagesCompleted = pageCompletionFlags.every((flag) => flag);

          // 에피소드 완료 ↔ 모든 페이지 완료
          expect(isCompleted).toBe(allPagesCompleted);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 3: 진행률 계산이 정확해야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 0, max: 5 }),
        (episodeId, completedPageCount) => {
          const pages = createTestPages(episodeId, 5);

          // 지정된 수만큼 페이지 완료
          const processedPages = pages.map((page, index) => {
            if (index < completedPageCount) {
              return completeAllTasksForPage(workflowEngine, page);
            }
            return page;
          });

          const progress = workflowEngine.calculateEpisodeProgress(
            episodeId,
            processedPages
          );

          const expectedCompletedTasks = completedPageCount * 4;
          const expectedPercentage = (expectedCompletedTasks / 20) * 100;

          expect(progress.totalTasks).toBe(20);
          expect(progress.completedTasks).toBe(expectedCompletedTasks);
          expect(progress.percentage).toBe(expectedPercentage);
        }
      ),
      { numRuns: 50 }
    );
  });

  it('Property 3: TaskType별 진행률이 정확해야 한다', () => {
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

          const progress = workflowEngine.calculateEpisodeProgress(
            episodeId,
            processedPages
          );

          // 각 TaskType별 완료 수 검증
          expect(progress.byTaskType[TaskType.BACKGROUND].completed).toBe(completedPageCount);
          expect(progress.byTaskType[TaskType.LINE_ART].completed).toBe(completedPageCount);
          expect(progress.byTaskType[TaskType.COLORING].completed).toBe(completedPageCount);
          expect(progress.byTaskType[TaskType.POST_PROCESSING].completed).toBe(completedPageCount);

          // 각 TaskType별 전체 수는 5
          expect(progress.byTaskType[TaskType.BACKGROUND].total).toBe(5);
          expect(progress.byTaskType[TaskType.LINE_ART].total).toBe(5);
          expect(progress.byTaskType[TaskType.COLORING].total).toBe(5);
          expect(progress.byTaskType[TaskType.POST_PROCESSING].total).toBe(5);
        }
      ),
      { numRuns: 50 }
    );
  });
});
