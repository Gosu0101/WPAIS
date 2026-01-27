import { ProjectManagerService } from '../../src/scheduling/services';
import { WorkflowEngineService } from '../../src/workflow/services';
import { Project } from '../../src/scheduling/entities';
import { Page } from '../../src/workflow/entities/page.entity';
import { CreateProjectInput } from '../../src/scheduling/types';
import { TaskType, TaskStatus } from '../../src/workflow/types';

/**
 * 테스트용 프로젝트 생성 헬퍼
 * 기본값을 사용하여 프로젝트를 빠르게 생성
 */
export async function createTestProject(
  projectManager: ProjectManagerService,
  overrides?: Partial<CreateProjectInput>,
): Promise<Project> {
  const defaultInput: CreateProjectInput = {
    title: 'Test Project',
    launchDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6개월 후
    episodeCount: 10,
    ...overrides,
  };

  return projectManager.createProject(defaultInput);
}

/**
 * 페이지의 모든 작업을 순차적으로 완료하는 헬퍼
 * BACKGROUND → LINE_ART → COLORING → POST_PROCESSING 순서로 완료
 */
export function completeAllTasksForPage(
  workflowEngine: WorkflowEngineService,
  page: Page,
): Page {
  const taskOrder: TaskType[] = [
    TaskType.BACKGROUND,
    TaskType.LINE_ART,
    TaskType.COLORING,
    TaskType.POST_PROCESSING,
  ];

  let updatedPage = page;

  for (const taskType of taskOrder) {
    updatedPage = workflowEngine.startTask(updatedPage, taskType);
    updatedPage = workflowEngine.completeTask(updatedPage, taskType);
  }

  return updatedPage;
}

/**
 * 에피소드의 모든 페이지를 완료하는 헬퍼
 */
export function completeEpisode(
  workflowEngine: WorkflowEngineService,
  pages: Page[],
): Page[] {
  return pages.map((page) => completeAllTasksForPage(workflowEngine, page));
}

/**
 * 특정 작업까지만 완료하는 헬퍼
 */
export function completeTasksUpTo(
  workflowEngine: WorkflowEngineService,
  page: Page,
  targetTask: TaskType,
): Page {
  const taskOrder: TaskType[] = [
    TaskType.BACKGROUND,
    TaskType.LINE_ART,
    TaskType.COLORING,
    TaskType.POST_PROCESSING,
  ];

  let updatedPage = page;
  const targetIndex = taskOrder.indexOf(targetTask);

  for (let i = 0; i <= targetIndex; i++) {
    updatedPage = workflowEngine.startTask(updatedPage, taskOrder[i]);
    updatedPage = workflowEngine.completeTask(updatedPage, taskOrder[i]);
  }

  return updatedPage;
}

/**
 * 페이지가 완전히 완료되었는지 확인하는 헬퍼
 */
export function isPageFullyCompleted(page: Page): boolean {
  return (
    page.backgroundStatus === TaskStatus.DONE &&
    page.lineArtStatus === TaskStatus.DONE &&
    page.coloringStatus === TaskStatus.DONE &&
    page.postProcessingStatus === TaskStatus.DONE
  );
}

/**
 * 완료된 작업 수를 계산하는 헬퍼
 */
export function countCompletedTasks(pages: Page[]): number {
  let count = 0;
  for (const page of pages) {
    if (page.backgroundStatus === TaskStatus.DONE) count++;
    if (page.lineArtStatus === TaskStatus.DONE) count++;
    if (page.coloringStatus === TaskStatus.DONE) count++;
    if (page.postProcessingStatus === TaskStatus.DONE) count++;
  }
  return count;
}
