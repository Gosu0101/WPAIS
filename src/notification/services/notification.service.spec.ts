import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { RecipientResolverService } from './recipient-resolver.service';
import { Notification, ProjectMember } from '../entities';
import { MemberRole, NotificationType } from '../types';
import { TaskType, TASK_TYPE_ORDER } from '../../workflow/types';
import { AlertSeverity } from '../../monitor/types';

describe('NotificationService', () => {
  let service: NotificationService;
  let notificationRepository: jest.Mocked<Repository<Notification>>;
  let recipientResolver: jest.Mocked<RecipientResolverService>;

  beforeEach(async () => {
    const mockNotificationRepo = {
      create: jest.fn((data) => ({ ...data, id: 'notif-1', createdAt: new Date() })),
      save: jest.fn((data) => Promise.resolve(data)),
      find: jest.fn(),
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      update: jest.fn(),
    };

    const mockRecipientResolver = {
      getProjectPDs: jest.fn(),
      getTaskWorker: jest.fn(),
      resolveRecipients: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        { provide: getRepositoryToken(Notification), useValue: mockNotificationRepo },
        { provide: RecipientResolverService, useValue: mockRecipientResolver },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    notificationRepository = module.get(getRepositoryToken(Notification));
    recipientResolver = module.get(RecipientResolverService);
  });


  describe('createNotification', () => {
    it('should create a notification', async () => {
      const input = {
        projectId: 'proj-1',
        recipientId: 'user-1',
        notificationType: NotificationType.TASK_COMPLETED,
        severity: AlertSeverity.INFO,
        title: 'Test',
        message: 'Test message',
      };

      const result = await service.createNotification(input);

      expect(notificationRepository.create).toHaveBeenCalledWith({
        ...input,
        isRead: false,
        readAt: null,
      });
      expect(notificationRepository.save).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const notification: Notification = {
        id: 'notif-1',
        projectId: 'proj-1',
        recipientId: 'user-1',
        notificationType: NotificationType.TASK_COMPLETED,
        severity: AlertSeverity.INFO,
        title: 'Test',
        message: 'Test',
        isRead: false,
        readAt: null,
        createdAt: new Date(),
      };

      notificationRepository.findOne.mockResolvedValue(notification);
      notificationRepository.save.mockImplementation((n) => Promise.resolve(n as Notification));

      const result = await service.markAsRead('notif-1');

      expect(result?.isRead).toBe(true);
      expect(result?.readAt).toBeInstanceOf(Date);
    });
  });

  /**
   * Property 2: Next Worker Notification on Task Complete
   * **Validates: Requirements 2.2**
   * 
   * 작업 완료 시 다음 공정 담당자에게 NEXT_TASK_READY 알림이 전송되어야 함
   */
  describe('Property 2: Next Worker Notification on Task Complete', () => {
    const taskTypesWithNext = TASK_TYPE_ORDER.slice(0, -1); // POST_PROCESSING 제외

    it('should notify next worker when task is completed', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 50 }),
          fc.constantFrom(...taskTypesWithNext),
          fc.uuid(),
          fc.uuid(),
          async (projectId, episodeNumber, pageNumber, taskType, pdUserId, workerUserId) => {
            // Setup
            const pd: ProjectMember = {
              id: 'pd-1',
              projectId,
              userId: pdUserId,
              role: MemberRole.PD,
              taskType: null,
              createdAt: new Date(),
            };

            const nextTaskType = TASK_TYPE_ORDER[TASK_TYPE_ORDER.indexOf(taskType) + 1];
            const nextWorker: ProjectMember = {
              id: 'worker-1',
              projectId,
              userId: workerUserId,
              role: MemberRole.WORKER,
              taskType: nextTaskType,
              createdAt: new Date(),
            };

            recipientResolver.getProjectPDs.mockResolvedValue([pd]);
            recipientResolver.getTaskWorker.mockResolvedValue(nextWorker);

            const createdNotifications: any[] = [];
            notificationRepository.save.mockImplementation((n) => {
              createdNotifications.push(n);
              return Promise.resolve(n as Notification);
            });

            // Act
            await service.notifyTaskCompleted({
              projectId,
              episodeNumber,
              pageNumber,
              taskType,
            });

            // Assert: NEXT_TASK_READY 알림이 다음 담당자에게 전송됨
            const nextTaskReadyNotif = createdNotifications.find(
              (n) => n.notificationType === NotificationType.NEXT_TASK_READY,
            );

            expect(nextTaskReadyNotif).toBeDefined();
            expect(nextTaskReadyNotif.recipientId).toBe(workerUserId);
            expect(nextTaskReadyNotif.metadata.taskType).toBe(nextTaskType);
          },
        ),
        { numRuns: 30 },
      );
    });


    it('should not send NEXT_TASK_READY for POST_PROCESSING (last task)', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.integer({ min: 1, max: 100 }),
          fc.integer({ min: 1, max: 50 }),
          fc.uuid(),
          async (projectId, episodeNumber, pageNumber, pdUserId) => {
            // Setup
            const pd: ProjectMember = {
              id: 'pd-1',
              projectId,
              userId: pdUserId,
              role: MemberRole.PD,
              taskType: null,
              createdAt: new Date(),
            };

            recipientResolver.getProjectPDs.mockResolvedValue([pd]);

            const createdNotifications: any[] = [];
            notificationRepository.save.mockImplementation((n) => {
              createdNotifications.push(n);
              return Promise.resolve(n as Notification);
            });

            // Act: POST_PROCESSING 완료
            await service.notifyTaskCompleted({
              projectId,
              episodeNumber,
              pageNumber,
              taskType: TaskType.POST_PROCESSING,
            });

            // Assert: NEXT_TASK_READY 알림이 없어야 함
            const nextTaskReadyNotif = createdNotifications.find(
              (n) => n.notificationType === NotificationType.NEXT_TASK_READY,
            );

            expect(nextTaskReadyNotif).toBeUndefined();
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count by severity', async () => {
      const notifications: Notification[] = [
        {
          id: '1',
          projectId: 'p1',
          recipientId: 'u1',
          notificationType: NotificationType.TASK_COMPLETED,
          severity: AlertSeverity.INFO,
          title: 'T1',
          message: 'M1',
          isRead: false,
          readAt: null,
          createdAt: new Date(),
        },
        {
          id: '2',
          projectId: 'p1',
          recipientId: 'u1',
          notificationType: NotificationType.TASK_DEADLINE_APPROACHING,
          severity: AlertSeverity.WARNING,
          title: 'T2',
          message: 'M2',
          isRead: false,
          readAt: null,
          createdAt: new Date(),
        },
      ];

      notificationRepository.find.mockResolvedValue(notifications);

      const result = await service.getUnreadCount('u1');

      expect(result.total).toBe(2);
      expect(result.bySeverity[AlertSeverity.INFO]).toBe(1);
      expect(result.bySeverity[AlertSeverity.WARNING]).toBe(1);
    });
  });
});
