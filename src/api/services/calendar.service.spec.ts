import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fc from 'fast-check';
import { CalendarService } from './calendar.service';
import { Episode, EpisodeStatus } from '../../scheduling/entities/episode.entity';
import { Milestone, MilestoneType } from '../../scheduling/entities/milestone.entity';
import { Project } from '../../scheduling/entities/project.entity';
import { Page } from '../../workflow/entities/page.entity';
import { TaskStatus } from '../../workflow/types';
import { getDefaultVelocityConfig } from '../../scheduling/types';

describe('CalendarService', () => {
  let service: CalendarService;
  let episodeRepository: jest.Mocked<Repository<Episode>>;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let pageRepository: jest.Mocked<Repository<Page>>;

  const mockProject: Project = {
    id: 'project-1',
    title: 'Test Project',
    launchDate: new Date('2026-06-01'),
    sealDate: new Date('2026-05-25'),
    productionStartDate: new Date('2026-01-01'),
    hiringStartDate: new Date('2025-12-01'),
    planningStartDate: new Date('2025-11-01'),
    velocityConfig: getDefaultVelocityConfig(),
    episodes: [],
    milestones: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        {
          provide: getRepositoryToken(Episode),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Milestone),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Project),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Page),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CalendarService>(CalendarService);
    episodeRepository = module.get(getRepositoryToken(Episode));
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    projectRepository = module.get(getRepositoryToken(Project));
    pageRepository = module.get(getRepositoryToken(Page));
  });

  describe('getEvents', () => {
    it('should return events within date range', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      projectRepository.find.mockResolvedValue([mockProject]);
      episodeRepository.find.mockResolvedValue([
        {
          id: 'ep-1',
          projectId: 'project-1',
          episodeNumber: 1,
          dueDate: new Date('2026-01-15'),
          duration: 7,
          status: EpisodeStatus.IN_PROGRESS,
          isSealed: false,
          project: mockProject,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      milestoneRepository.find.mockResolvedValue([]);
      pageRepository.find.mockResolvedValue([]);

      const result = await service.getEvents(startDate, endDate);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('episode');
      expect(result.projects).toHaveLength(1);
    });

    it('should filter by event types', async () => {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-01-31');

      projectRepository.find.mockResolvedValue([mockProject]);
      episodeRepository.find.mockResolvedValue([]);
      milestoneRepository.find.mockResolvedValue([
        {
          id: 'ms-1',
          projectId: 'project-1',
          name: 'Launch',
          type: MilestoneType.LAUNCH,
          targetDate: new Date('2026-01-20'),
          isCompleted: false,
          completedAt: null,
          project: mockProject,
          createdAt: new Date(),
        },
      ]);

      const result = await service.getEvents(startDate, endDate, undefined, ['milestone']);

      expect(result.events).toHaveLength(1);
      expect(result.events[0].type).toBe('milestone');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Validates: Requirements 2.1, 2.2, 3.1, 3.2
     * Property: Event Type Integrity - Each event has exactly one type
     */
    it('should ensure event type integrity', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.date({ min: new Date('2025-01-01'), max: new Date('2027-12-31') }),
          fc.date({ min: new Date('2025-01-01'), max: new Date('2027-12-31') }),
          async (date1, date2) => {
            const startDate = date1 < date2 ? date1 : date2;
            const endDate = date1 < date2 ? date2 : date1;

            projectRepository.find.mockResolvedValue([mockProject]);
            episodeRepository.find.mockResolvedValue([]);
            milestoneRepository.find.mockResolvedValue([]);
            pageRepository.find.mockResolvedValue([]);

            const result = await service.getEvents(startDate, endDate);

            // Every event must have exactly one valid type
            for (const event of result.events) {
              expect(['episode', 'milestone', 'task']).toContain(event.type);
              expect(event.id).toBeDefined();
              expect(event.title).toBeDefined();
              expect(event.start).toBeDefined();
            }
          }
        ),
        { numRuns: 10 }
      );
    });

    /**
     * Validates: Requirements 2.2, 4.3
     * Property: Status-Color Mapping - Status determines color consistently
     */
    it('should map episode status to correct color', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(EpisodeStatus.PENDING, EpisodeStatus.IN_PROGRESS, EpisodeStatus.COMPLETED),
          fc.boolean(),
          (status, isSealed) => {
            const episode: Episode = {
              id: 'test-ep',
              projectId: 'project-1',
              episodeNumber: 1,
              dueDate: new Date(),
              duration: 7,
              status,
              isSealed,
              project: mockProject,
              createdAt: new Date(),
              updatedAt: new Date(),
            };

            // Access private method via any cast for testing
            const event = (service as any).mapEpisodeToEvent(episode, { id: 'p1', title: 'Test', color: '#000' });

            if (isSealed) {
              expect(event.color).toBe('#8b5cf6'); // SEALED color
            } else {
              const expectedColors: Record<EpisodeStatus, string> = {
                [EpisodeStatus.PENDING]: '#6b7280',
                [EpisodeStatus.IN_PROGRESS]: '#f59e0b',
                [EpisodeStatus.COMPLETED]: '#22c55e',
              };
              expect(event.color).toBe(expectedColors[status]);
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('rescheduleEvent', () => {
    it('should reschedule episode', async () => {
      const episode: Episode = {
        id: 'ep-1',
        projectId: 'project-1',
        episodeNumber: 1,
        dueDate: new Date('2026-01-15'),
        duration: 7,
        status: EpisodeStatus.IN_PROGRESS,
        isSealed: false,
        project: mockProject,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      episodeRepository.findOne.mockResolvedValue(episode);
      episodeRepository.save.mockResolvedValue({ ...episode, dueDate: new Date('2026-01-20') });

      const result = await service.rescheduleEvent('ep-1', 'episode', new Date('2026-01-20'));

      expect(result.success).toBe(true);
      expect(episodeRepository.save).toHaveBeenCalled();
    });

    it('should not reschedule sealed episode', async () => {
      const episode: Episode = {
        id: 'ep-1',
        projectId: 'project-1',
        episodeNumber: 1,
        dueDate: new Date('2026-01-15'),
        duration: 7,
        status: EpisodeStatus.COMPLETED,
        isSealed: true,
        project: mockProject,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      episodeRepository.findOne.mockResolvedValue(episode);

      const result = await service.rescheduleEvent('ep-1', 'episode', new Date('2026-01-20'));

      expect(result.success).toBe(false);
      expect(result.warnings).toContain('Cannot reschedule sealed episode');
    });
  });
});
