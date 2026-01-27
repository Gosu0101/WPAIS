import { Page } from '../../src/workflow/entities/page.entity';
import { TaskStatus } from '../../src/workflow/types';
import { v4 as uuidv4 } from 'uuid';

/**
 * 테스트용 Page 팩토리
 * 기본 초기 상태의 Page 생성
 */
export function createTestPage(
  episodeId: string,
  pageNumber: number = 1,
  overrides?: Partial<Page>,
): Page {
  const page = new Page();
  page.id = uuidv4();
  page.episodeId = episodeId;
  page.pageNumber = pageNumber;
  page.heightPx = 20000;
  page.backgroundStatus = TaskStatus.READY;
  page.lineArtStatus = TaskStatus.LOCKED;
  page.coloringStatus = TaskStatus.LOCKED;
  page.postProcessingStatus = TaskStatus.LOCKED;
  page.createdAt = new Date();
  page.updatedAt = new Date();

  if (overrides) {
    Object.assign(page, overrides);
  }

  return page;
}

/**
 * 테스트용 Page 배열 팩토리
 * 에피소드에 대한 5개의 Page 생성
 */
export function createTestPages(
  episodeId: string,
  count: number = 5,
): Page[] {
  const pages: Page[] = [];
  for (let i = 1; i <= count; i++) {
    pages.push(createTestPage(episodeId, i));
  }
  return pages;
}

/**
 * 완료된 상태의 Page 팩토리
 */
export function createCompletedPage(
  episodeId: string,
  pageNumber: number = 1,
): Page {
  return createTestPage(episodeId, pageNumber, {
    backgroundStatus: TaskStatus.DONE,
    lineArtStatus: TaskStatus.DONE,
    coloringStatus: TaskStatus.DONE,
    postProcessingStatus: TaskStatus.DONE,
  });
}

/**
 * 부분 완료된 Page 팩토리
 * BACKGROUND와 LINE_ART만 완료된 상태
 */
export function createPartiallyCompletedPage(
  episodeId: string,
  pageNumber: number = 1,
): Page {
  return createTestPage(episodeId, pageNumber, {
    backgroundStatus: TaskStatus.DONE,
    lineArtStatus: TaskStatus.DONE,
    coloringStatus: TaskStatus.READY,
    postProcessingStatus: TaskStatus.LOCKED,
  });
}

/**
 * 테스트용 날짜 생성 헬퍼
 * 현재 날짜로부터 지정된 일수 후의 날짜 반환
 */
export function createFutureDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

/**
 * 테스트용 날짜 생성 헬퍼
 * 현재 날짜로부터 지정된 일수 전의 날짜 반환
 */
export function createPastDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}
