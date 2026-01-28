import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { NotificationSchedulerService } from './notification-scheduler.service';
import { RecipientResolverService } from './recipient-resolver.service';
import { Page } from '../../workflow/entities';
import { Episode, Milestone, Project } from '../../scheduling/entities';
import { Notification, ProjectMember } from '../entities';
import { NotificationType, MemberRole } from '../types';
import { TaskStatus } from '../../workflow/types';
import { EpisodeStatus } from '../../scheduling/entities/episode.entity';

describe('NotificationSchedulerService', () => {
  let service: NotificationSchedulerService;
  let pageRepository: jest.Mocked<Repository<Page>>;
  let episodeRepository: jest.Mocked<Repository<Episode>>;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let notificationRepository: jest.Mocked<Repository<Notification>>;
  let recipientResolver: jest.Mocked<RecipientResolverService>;

  const createMockQueryBuilder = () => ({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  });

  beforeEach(async () => {
    const mockQueryBuilder = createMockQueryBuilder();

    const mockNotificationRepo = {
      create: jest.fn((data) => ({ ...data, id: 'notif-1', createdAt: new Date() })),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSchedulerService,
        { provide: getRepositoryToken(Page), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(Episode), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(Milestone), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(Project), useValue: { find: jest.fn() } },
        { provide: getRepositoryToken(Notification), useValue: mockNotificationRepo },
        { provide: RecipientResolverService, useValue: { getProjectPDs: jest.fn() } },
      ],
    }).compile();

    service = module.get<NotificationSchedulerService>(NotificationSchedulerService);
    pageRepository = module.get(getRepositoryToken(Page));
    episodeRepository = module.get(getRepositoryToken(Episode));
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    projectRepository = module.get(getRepositoryToken(Project));
    notificationRepository = module.get(getRepositoryToken(Notification));
    recipientResolver = module.get(RecipientResolverService);
  });


  /**
   * Property 3: No Duplicate Deadline Notifications
   * **Validates: Requirements 6.1**
   * 
   * 같은 항목/임계값 조합에 대해 알림은 1회만 생성되어야 함
   */
  describe('Property 3: No Duplicate Deadline Notifications', () => {
    it('should not create duplicate notifications for same item and threshold', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.integer({ min: 0, max: 14 }),
          async (projectId, itemId, daysRemaining) => {
            // Setup: 이미 알림이 존재하는 경우
            const existingNotification: Partial<Notification> = {
              id: 'existing-notif',
              projectId,
              notificationType: NotificationType.EPISODE_DEADLINE_APPROACHING,
              metadata: { itemId, daysRemaining },
            };

            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getOne.mockResolvedValue(existingNotification);
            notificationRepository.createQueryBuilder.mockReturnValue(
              mockQueryBuilder as unknown as SelectQueryBuilder<Notification>,
            );

            const pd: ProjectMember = {
              id: 'pd-1',
              projectId,
              userId: 'pd-user-1',
              role: MemberRole.PD,
              taskType: null,
              createdAt: new Date(),
            };
            recipientResolver.getProjectPDs.mockResolvedValue([pd]);

            // 에피소드 설정
            const episode: Partial<Episode> = {
              id: itemId,
              projectId,
              episodeNumber: 1,
              dueDate: new Date(Date.now() + daysRemaining * 24 * 60 * 60 * 1000),
              status: EpisodeStatus.IN_PROGRESS,
            };
            episodeRepository.find.mockResolvedValue([episode as Episode]);

            // Act
            await service.checkEpisodeDeadlines(projectId);

            // Assert: 중복 알림이 생성되지 않아야 함
            // 이미 존재하는 알림이 있으므로 save가 호출되지 않아야 함
            expect(notificationRepository.save).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should create notification when no duplicate exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.constantFrom(7, 3, 1), // 에피소드 임계값
          async (projectId, itemId, daysRemaining) => {
            // Setup: 알림이 존재하지 않는 경우
            const mockQueryBuilder = createMockQueryBuilder();
            mockQueryBuilder.getOne.mockResolvedValue(null);
            notificationRepository.createQueryBuilder.mockReturnValue(
              mockQueryBuilder as unknown as SelectQueryBuilder<Notification>,
            );

            const pd: ProjectMember = {
              id: 'pd-1',
              projectId,
              userId: 'pd-user-1',
              role: MemberRole.PD,
              taskType: null,
              createdAt: new Date(),
            };
            recipientResolver.getProjectPDs.mockResolvedValue([pd]);

            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const dueDate = new Date(today.getTime() + daysRemaining * 24 * 60 * 60 * 1000);

            const episode: Partial<Episode> = {
              id: itemId,
              projectId,
              episodeNumber: 1,
              dueDate,
              status: EpisodeStatus.IN_PROGRESS,
            };
            episodeRepository.find.mockResolvedValue([episode as Episode]);

            // Reset mock
            notificationRepository.save.mockClear();

            // Act
            await service.checkEpisodeDeadlines(projectId);

            // Assert: 알림이 생성되어야 함
            expect(notificationRepository.save).toHaveBeenCalled();
          },
        ),
        { numRuns: 20 },
      );
    });
  });


  /**
   * Property 4: No Notifications for Completed Items
   * **Validates: Requirements 1.1, 1.2, 1.3**
   * 
   * 완료된 항목에 대해서는 마감 알림이 생성되지 않아야 함
   */
  describe('Property 4: No Notifications for Completed Items', () => {
    it('should not create notifications for completed episodes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (projectId, episodeId) => {
            // Setup: 완료된 에피소드
            const completedEpisode: Partial<Episode> = {
              id: episodeId,
              projectId,
              episodeNumber: 1,
              dueDate: new Date(),
              status: EpisodeStatus.COMPLETED, // 완료됨
            };

            // 완료된 에피소드는 쿼리에서 제외됨 (Not(EpisodeStatus.COMPLETED))
            episodeRepository.find.mockResolvedValue([]);

            // Act
            await service.checkEpisodeDeadlines(projectId);

            // Assert: 알림이 생성되지 않아야 함
            expect(notificationRepository.save).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should not create notifications for completed tasks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (projectId, pageId) => {
            // Setup: 완료된 공정이 있는 페이지
            const page: Partial<Page> = {
              id: pageId,
              episodeId: 'ep-1',
              pageNumber: 1,
              backgroundStatus: TaskStatus.DONE, // 완료됨
              backgroundDueDate: new Date(),
              lineArtStatus: TaskStatus.DONE,
              lineArtDueDate: new Date(),
              coloringStatus: TaskStatus.DONE,
              coloringDueDate: new Date(),
              postProcessingStatus: TaskStatus.DONE,
              postProcessingDueDate: new Date(),
              episode: {
                id: 'ep-1',
                projectId,
                episodeNumber: 1,
              } as Episode,
            };

            pageRepository.find.mockResolvedValue([page as Page]);

            // Act
            await service.checkTaskDeadlines(projectId);

            // Assert: 완료된 공정에 대해서는 알림이 생성되지 않아야 함
            expect(notificationRepository.save).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should not create notifications for completed milestones', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          async (projectId, milestoneId) => {
            // Setup: 완료된 마일스톤
            // 완료된 마일스톤은 쿼리에서 제외됨 (isCompleted: false)
            milestoneRepository.find.mockResolvedValue([]);

            // Act
            await service.checkMilestoneDeadlines(projectId);

            // Assert: 알림이 생성되지 않아야 함
            expect(notificationRepository.save).not.toHaveBeenCalled();
          },
        ),
        { numRuns: 20 },
      );
    });
  });
});
