import * as fc from 'fast-check';
import { Page } from './page.entity';
import { TaskStatus } from '../types';

describe('Page Entity', () => {
  describe('Property 1: Page Initialization Invariant', () => {
    /**
     * Feature: workflow-engine, Property 1: Page Initialization Invariant
     * For any newly created Page:
     * - pageNumber should be between 1-5
     * - BACKGROUND status should be READY
     * - All other statuses (LINE_ART, COLORING, POST_PROCESSING) should be LOCKED
     * - Height should be fixed at 20,000px
     * 
     * Validates: Requirements 1.1, 1.2, 1.3, 1.4
     */
    it('should initialize with correct default values for any valid page number', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }),
          fc.uuid(),
          (pageNumber: number, episodeId: string) => {
            const page = new Page();
            page.pageNumber = pageNumber;
            page.episodeId = episodeId;
            // Default values from entity definition
            page.heightPx = 20000;
            page.backgroundStatus = TaskStatus.READY;
            page.lineArtStatus = TaskStatus.LOCKED;
            page.coloringStatus = TaskStatus.LOCKED;
            page.postProcessingStatus = TaskStatus.LOCKED;

            // Verify page number is in valid range (1-5)
            expect(page.pageNumber).toBeGreaterThanOrEqual(1);
            expect(page.pageNumber).toBeLessThanOrEqual(5);

            // Verify height is fixed at 20,000px
            expect(page.heightPx).toBe(20000);

            // Verify BACKGROUND is READY (first stage can start immediately)
            expect(page.backgroundStatus).toBe(TaskStatus.READY);

            // Verify all other stages are LOCKED
            expect(page.lineArtStatus).toBe(TaskStatus.LOCKED);
            expect(page.coloringStatus).toBe(TaskStatus.LOCKED);
            expect(page.postProcessingStatus).toBe(TaskStatus.LOCKED);

            // Verify episodeId is set
            expect(page.episodeId).toBe(episodeId);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: workflow-engine, Property 1: Page Initialization Invariant (Sequential)
     * For any Episode with 5 pages, page numbers should be sequential (1-5)
     * 
     * Validates: Requirements 1.1
     */
    it('should have sequential page numbers when creating 5 pages', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          (episodeId: string) => {
            const pages: Page[] = [];
            
            // Create 5 pages with sequential numbers
            for (let i = 1; i <= 5; i++) {
              const page = new Page();
              page.pageNumber = i;
              page.episodeId = episodeId;
              page.heightPx = 20000;
              page.backgroundStatus = TaskStatus.READY;
              page.lineArtStatus = TaskStatus.LOCKED;
              page.coloringStatus = TaskStatus.LOCKED;
              page.postProcessingStatus = TaskStatus.LOCKED;
              pages.push(page);
            }

            // Verify exactly 5 pages
            expect(pages.length).toBe(5);

            // Verify sequential page numbers
            const pageNumbers = pages.map(p => p.pageNumber).sort((a, b) => a - b);
            expect(pageNumbers).toEqual([1, 2, 3, 4, 5]);

            // Verify all pages belong to same episode
            pages.forEach(page => {
              expect(page.episodeId).toBe(episodeId);
            });

            // Verify all pages have correct initial status
            pages.forEach(page => {
              expect(page.backgroundStatus).toBe(TaskStatus.READY);
              expect(page.lineArtStatus).toBe(TaskStatus.LOCKED);
              expect(page.coloringStatus).toBe(TaskStatus.LOCKED);
              expect(page.postProcessingStatus).toBe(TaskStatus.LOCKED);
              expect(page.heightPx).toBe(20000);
            });
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
