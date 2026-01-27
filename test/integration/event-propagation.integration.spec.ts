import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { WorkflowEngineService } from '../../src/workflow/services';
import { TaskStatus, TaskType, WORKFLOW_EVENTS } from '../../src/workflow/types';
import { createTestPage, createTestPages } from '../utils/test-factories';
import { completeAllTasksForPage, completeTasksUpTo } from '../utils/test-helpers';
import * as fc from 'fast-check';

describe('Event Propagation Integration', () => {
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

  describe('TaskUnlockedEvent 전파', () => {
    /**
     * Requirements: 7.1
     * 작업 완료 → 다음 작업 잠금 해제 → 이벤트 발행 검증
     */
    it('BACKGROUND 완료 시 TaskUnlockedEvent(LINE_ART)가 발행되어야 한다', () => {
      const page = createTestPage('episode-1', 1);

      let updatedPage = workflowEngine.startTask(page, TaskType.BACKGROUND);
      updatedPage = workflowEngine.completeTask(updatedPage, TaskType.BACKGROUND);

      const unlockedEvents = emittedEvents.filter(
        (e) => e.event === WORKFLOW_EVENTS.TASK_UNLOCKED
      );

      expect(unlockedEvents).toHaveLength(1);
      expect(unlockedEvents[0].payload).toMatchObject({
        taskType: TaskType.LINE_ART,
      });
    });

    it('LINE_ART 완료 시 TaskUnlockedEvent(COLORING)가 발행되어야 한다', () => {
      const page = createTestPage('episode-1', 1);

      let updatedPage = completeTasksUpTo(workflowEngine, page, TaskType.BACKGROUND);
      emittedEvents = []; // 이전 이벤트 초기화

      updatedPage = workflowEngine.startTask(updatedPage, TaskType.LINE_ART);
      updatedPage = workflowEngine.completeTask(updatedPage, TaskType.LINE_ART);

      const unlockedEvents = emittedEvents.filter(
        (e) => e.event === WORKFLOW_EVENTS.TASK_UNLOCKED
      );

      expect(unlockedEvents).toHaveLength(1);
      expect(unlockedEvents[0].payload).toMatchObject({
        taskType: TaskType.COLORING,
      });
    });

    it('POST_PROCESSING 완료 시 TaskUnlockedEvent가 발행되지 않아야 한다', () => {
      const page = createTestPage('episode-1', 1);

      let updatedPage = completeTasksUpTo(workflowEngine, page, TaskType.COLORING);
      emittedEvents = [];

      updatedPage = workflowEngine.startTask(updatedPage, TaskType.POST_PROCESSING);
      updatedPage = workflowEngine.completeTask(updatedPage, TaskType.POST_PROCESSING);

      const unlockedEvents = emittedEvents.filter(
        (e) => e.event === WORKFLOW_EVENTS.TASK_UNLOCKED
      );

      expect(unlockedEvents).toHaveLength(0);
    });
  });

  describe('EpisodeCompletedEvent 전파', () => {
    /**
     * Requirements: 7.2
     * 에피소드 완료 → 이벤트 발행 → Monitor 수신 검증
     */
    it('에피소드 완료 시 EpisodeCompletedEvent가 발행되어야 한다', () => {
      const episodeId = 'episode-1';
      const pages = createTestPages(episodeId, 5);

      const completedPages = pages.map((page) =>
        completeAllTasksForPage(workflowEngine, page)
      );

      emittedEvents = [];
      workflowEngine.checkAndEmitEpisodeCompleted(episodeId, completedPages);

      const completedEvents = emittedEvents.filter(
        (e) => e.event === WORKFLOW_EVENTS.EPISODE_COMPLETED
      );

      expect(completedEvents).toHaveLength(1);
      expect(completedEvents[0].payload).toMatchObject({
        episodeId,
      });
    });

    it('에피소드 미완료 시 EpisodeCompletedEvent가 발행되지 않아야 한다', () => {
      const episodeId = 'episode-1';
      const pages = createTestPages(episodeId, 5);

      // 4개만 완료
      const partialPages = [
        ...pages.slice(0, 4).map((page) => completeAllTasksForPage(workflowEngine, page)),
        pages[4],
      ];

      emittedEvents = [];
      workflowEngine.checkAndEmitEpisodeCompleted(episodeId, partialPages);

      const completedEvents = emittedEvents.filter(
        (e) => e.event === WORKFLOW_EVENTS.EPISODE_COMPLETED
      );

      expect(completedEvents).toHaveLength(0);
    });
  });
});


describe('Property Tests: Event Emission Completeness', () => {
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
   * Property 6: Event Emission Completeness
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
   * 
   * For any state change:
   * - Task unlock SHALL emit TaskUnlockedEvent
   * - Episode completion SHALL emit EpisodeCompletedEvent
   */
  it('Property 6: 작업 완료 시 정확히 하나의 TaskUnlockedEvent가 발행되어야 한다 (마지막 작업 제외)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.constantFrom(TaskType.BACKGROUND, TaskType.LINE_ART, TaskType.COLORING),
        (episodeId, taskType) => {
          const page = createTestPage(episodeId, 1);
          emittedEvents = [];

          // 선행 작업 완료
          let updatedPage = page;
          const taskOrder = [TaskType.BACKGROUND, TaskType.LINE_ART, TaskType.COLORING];
          const targetIndex = taskOrder.indexOf(taskType);

          for (let i = 0; i <= targetIndex; i++) {
            updatedPage = workflowEngine.startTask(updatedPage, taskOrder[i]);
            updatedPage = workflowEngine.completeTask(updatedPage, taskOrder[i]);
          }

          // 각 작업 완료마다 하나의 TaskUnlockedEvent 발행
          const unlockedEvents = emittedEvents.filter(
            (e) => e.event === WORKFLOW_EVENTS.TASK_UNLOCKED
          );

          // BACKGROUND, LINE_ART, COLORING 완료 시 각각 다음 작업 unlock
          expect(unlockedEvents.length).toBe(targetIndex + 1);
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 6: 에피소드 완료 시 정확히 하나의 EpisodeCompletedEvent가 발행되어야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        (episodeId) => {
          const pages = createTestPages(episodeId, 5);
          const completedPages = pages.map((page) =>
            completeAllTasksForPage(workflowEngine, page)
          );

          emittedEvents = [];
          workflowEngine.checkAndEmitEpisodeCompleted(episodeId, completedPages);

          const completedEvents = emittedEvents.filter(
            (e) => e.event === WORKFLOW_EVENTS.EPISODE_COMPLETED
          );

          expect(completedEvents).toHaveLength(1);
          expect(completedEvents[0].payload).toMatchObject({ episodeId });
        }
      ),
      { numRuns: 20 }
    );
  });

  it('Property 6: 미완료 에피소드에서는 EpisodeCompletedEvent가 발행되지 않아야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.integer({ min: 0, max: 4 }),
        (episodeId, completedCount) => {
          const pages = createTestPages(episodeId, 5);

          const processedPages = pages.map((page, index) => {
            if (index < completedCount) {
              return completeAllTasksForPage(workflowEngine, page);
            }
            return page;
          });

          emittedEvents = [];
          const wasCompleted = workflowEngine.checkAndEmitEpisodeCompleted(
            episodeId,
            processedPages
          );

          const completedEvents = emittedEvents.filter(
            (e) => e.event === WORKFLOW_EVENTS.EPISODE_COMPLETED
          );

          // 5개 미만 완료 시 이벤트 없음
          expect(wasCompleted).toBe(false);
          expect(completedEvents).toHaveLength(0);
        }
      ),
      { numRuns: 20 }
    );
  });
});
