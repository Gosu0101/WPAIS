import * as fc from 'fast-check';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RecipientResolverService } from './recipient-resolver.service';
import { ProjectMember } from '../entities';
import { MemberRole, NotificationType } from '../types';
import { TaskType } from '../../workflow/types';

describe('RecipientResolverService', () => {
  let service: RecipientResolverService;
  let memberRepository: jest.Mocked<Repository<ProjectMember>>;

  beforeEach(async () => {
    const mockRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecipientResolverService,
        {
          provide: getRepositoryToken(ProjectMember),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<RecipientResolverService>(RecipientResolverService);
    memberRepository = module.get(getRepositoryToken(ProjectMember));
  });

  describe('getProjectPDs', () => {
    it('should return PD members for a project', async () => {
      const projectId = 'project-1';
      const pds: ProjectMember[] = [
        {
          id: 'pd-1',
          projectId,
          userId: 'user-1',
          role: MemberRole.PD,
          taskType: null,
          createdAt: new Date(),
        },
      ];

      memberRepository.find.mockResolvedValue(pds);

      const result = await service.getProjectPDs(projectId);

      expect(result).toEqual(pds);
      expect(memberRepository.find).toHaveBeenCalledWith({
        where: { projectId, role: MemberRole.PD },
      });
    });
  });

  describe('getTaskWorker', () => {
    it('should return worker for specific task type', async () => {
      const projectId = 'project-1';
      const worker: ProjectMember = {
        id: 'worker-1',
        projectId,
        userId: 'user-2',
        role: MemberRole.WORKER,
        taskType: TaskType.COLORING,
        createdAt: new Date(),
      };

      memberRepository.findOne.mockResolvedValue(worker);

      const result = await service.getTaskWorker(projectId, TaskType.COLORING);

      expect(result).toEqual(worker);
    });
  });

  /**
   * Property 1: PD Always Receives Notifications
   * **Validates: Requirements 2.3, 3.1**
   * 
   * PD는 NEXT_TASK_READY를 제외한 모든 알림을 수신해야 함
   */
  describe('Property 1: PD Always Receives Notifications', () => {
    const notificationTypesExceptNextTaskReady = Object.values(NotificationType)
      .filter((t) => t !== NotificationType.NEXT_TASK_READY);

    it('PD should receive all notifications except NEXT_TASK_READY', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.constantFrom(...notificationTypesExceptNextTaskReady),
          fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
          async (projectId, notificationType, pdUserIds) => {
            // Setup: PD 멤버 목록 생성
            const pds: ProjectMember[] = pdUserIds.map((userId, idx) => ({
              id: `pd-${idx}`,
              projectId,
              userId,
              role: MemberRole.PD,
              taskType: null,
              createdAt: new Date(),
            }));

            memberRepository.find.mockResolvedValue(pds);

            // Act
            const recipients = await service.resolveRecipients(
              projectId,
              notificationType,
            );

            // Assert: 모든 PD가 수신자에 포함되어야 함
            for (const pdUserId of pdUserIds) {
              expect(recipients).toContain(pdUserId);
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    it('NEXT_TASK_READY should only go to next worker, not PD', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          fc.constantFrom(...Object.values(TaskType)),
          async (projectId, pdUserId, workerUserId, nextTaskType) => {
            // Setup
            const pds: ProjectMember[] = [
              {
                id: 'pd-1',
                projectId,
                userId: pdUserId,
                role: MemberRole.PD,
                taskType: null,
                createdAt: new Date(),
              },
            ];

            const worker: ProjectMember = {
              id: 'worker-1',
              projectId,
              userId: workerUserId,
              role: MemberRole.WORKER,
              taskType: nextTaskType,
              createdAt: new Date(),
            };

            memberRepository.find.mockResolvedValue(pds);
            memberRepository.findOne.mockResolvedValue(worker);

            // Act
            const recipients = await service.resolveRecipients(
              projectId,
              NotificationType.NEXT_TASK_READY,
              { nextTaskType },
            );

            // Assert: PD는 포함되지 않고, 다음 담당자만 포함
            expect(recipients).not.toContain(pdUserId);
            expect(recipients).toContain(workerUserId);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('resolveRecipients', () => {
    it('should return unique recipients', async () => {
      const projectId = 'project-1';
      const userId = 'user-1';

      // 같은 userId를 가진 PD가 여러 번 반환되는 경우
      const pds: ProjectMember[] = [
        {
          id: 'pd-1',
          projectId,
          userId,
          role: MemberRole.PD,
          taskType: null,
          createdAt: new Date(),
        },
        {
          id: 'pd-2',
          projectId,
          userId, // 같은 userId
          role: MemberRole.PD,
          taskType: null,
          createdAt: new Date(),
        },
      ];

      memberRepository.find.mockResolvedValue(pds);

      const recipients = await service.resolveRecipients(
        projectId,
        NotificationType.TASK_COMPLETED,
      );

      // 중복 제거 확인
      expect(recipients).toHaveLength(1);
      expect(recipients).toContain(userId);
    });
  });
});
