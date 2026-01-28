import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { Notification } from '../entities';
import {
  NotificationType,
  CreateNotificationInput,
  NotificationFilterOptions,
} from '../types';
import { AlertSeverity } from '../../monitor/types';
import { RecipientResolverService } from './recipient-resolver.service';
import { TaskType, TASK_TYPE_ORDER } from '../../workflow/types';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly recipientResolver: RecipientResolverService,
  ) {}

  /**
   * 알림 생성
   */
  async createNotification(input: CreateNotificationInput): Promise<Notification> {
    const notification = this.notificationRepository.create({
      ...input,
      isRead: false,
      readAt: null,
    });
    return this.notificationRepository.save(notification);
  }

  /**
   * 알림 목록 조회 (필터링, 페이지네이션)
   */
  async getNotifications(
    options: NotificationFilterOptions,
    page = 1,
    limit = 20,
  ): Promise<{ data: Notification[]; total: number }> {
    const where: FindOptionsWhere<Notification> = {};

    if (options.projectId) where.projectId = options.projectId;
    if (options.recipientId) where.recipientId = options.recipientId;
    if (options.notificationType) where.notificationType = options.notificationType;
    if (options.severity) where.severity = options.severity;
    if (options.isRead !== undefined) where.isRead = options.isRead;

    if (options.startDate && options.endDate) {
      where.createdAt = Between(options.startDate, options.endDate);
    }

    const [data, total] = await this.notificationRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { data, total };
  }

  /**
   * 알림 확인 처리
   */
  async markAsRead(notificationId: string): Promise<Notification | null> {
    const notification = await this.notificationRepository.findOne({
      where: { id: notificationId },
    });

    if (!notification) return null;

    notification.isRead = true;
    notification.readAt = new Date();
    return this.notificationRepository.save(notification);
  }

  /**
   * 전체 확인 처리
   */
  async markAllAsRead(recipientId: string, projectId?: string): Promise<number> {
    const where: FindOptionsWhere<Notification> = {
      recipientId,
      isRead: false,
    };
    if (projectId) where.projectId = projectId;

    const result = await this.notificationRepository.update(where, {
      isRead: true,
      readAt: new Date(),
    });

    return result.affected || 0;
  }

  /**
   * 미확인 알림 수 조회
   */
  async getUnreadCount(
    recipientId: string,
    projectId?: string,
  ): Promise<{ total: number; bySeverity: Record<string, number> }> {
    const where: FindOptionsWhere<Notification> = {
      recipientId,
      isRead: false,
    };
    if (projectId) where.projectId = projectId;

    const notifications = await this.notificationRepository.find({ where });
    const total = notifications.length;

    const bySeverity: Record<string, number> = {};
    for (const n of notifications) {
      bySeverity[n.severity] = (bySeverity[n.severity] || 0) + 1;
    }

    return { total, bySeverity };
  }


  /**
   * 다음 공정 타입 반환
   */
  private getNextTaskType(taskType: TaskType): TaskType | null {
    const currentIndex = TASK_TYPE_ORDER.indexOf(taskType);
    if (currentIndex === -1 || currentIndex === TASK_TYPE_ORDER.length - 1) {
      return null;
    }
    return TASK_TYPE_ORDER[currentIndex + 1];
  }

  /**
   * 작업 완료 알림 생성
   * - PD에게 TASK_COMPLETED 알림
   * - 다음 담당자에게 NEXT_TASK_READY 알림
   */
  async notifyTaskCompleted(event: {
    projectId: string;
    episodeNumber: number;
    pageNumber: number;
    taskType: TaskType;
  }): Promise<void> {
    const { projectId, episodeNumber, pageNumber, taskType } = event;
    const nextTaskType = this.getNextTaskType(taskType);

    // 1. PD에게 작업 완료 알림
    const pds = await this.recipientResolver.getProjectPDs(projectId);
    for (const pd of pds) {
      await this.createNotification({
        projectId,
        recipientId: pd.userId,
        notificationType: NotificationType.TASK_COMPLETED,
        severity: AlertSeverity.INFO,
        title: `${taskType} 작업 완료`,
        message: `EP${episodeNumber} P${pageNumber} ${taskType} 작업이 완료되었습니다.`,
        metadata: { episodeNumber, pageNumber, taskType, nextTaskType },
      });
    }

    // 2. 다음 공정 담당자에게 알림
    if (nextTaskType) {
      const nextWorker = await this.recipientResolver.getTaskWorker(
        projectId,
        nextTaskType,
      );
      if (nextWorker) {
        await this.createNotification({
          projectId,
          recipientId: nextWorker.userId,
          notificationType: NotificationType.NEXT_TASK_READY,
          severity: AlertSeverity.INFO,
          title: `${nextTaskType} 작업 준비`,
          message: `EP${episodeNumber} P${pageNumber} ${nextTaskType} 작업을 시작할 수 있습니다.`,
          metadata: {
            episodeNumber,
            pageNumber,
            previousTaskType: taskType,
            taskType: nextTaskType,
          },
        });
      }
    }
  }

  /**
   * 작업 시작 알림 (PD에게)
   */
  async notifyTaskStarted(event: {
    projectId: string;
    episodeNumber: number;
    pageNumber: number;
    taskType: TaskType;
  }): Promise<void> {
    const { projectId, episodeNumber, pageNumber, taskType } = event;

    const pds = await this.recipientResolver.getProjectPDs(projectId);
    for (const pd of pds) {
      await this.createNotification({
        projectId,
        recipientId: pd.userId,
        notificationType: NotificationType.TASK_STARTED,
        severity: AlertSeverity.INFO,
        title: `${taskType} 작업 시작`,
        message: `EP${episodeNumber} P${pageNumber} ${taskType} 작업이 시작되었습니다.`,
        metadata: { episodeNumber, pageNumber, taskType },
      });
    }
  }

  /**
   * 에피소드 완료 알림 (PD에게)
   */
  async notifyEpisodeCompleted(event: {
    projectId: string;
    episodeNumber: number;
    completedAt: Date;
    bufferStatus?: string;
  }): Promise<void> {
    const { projectId, episodeNumber, completedAt, bufferStatus } = event;

    const pds = await this.recipientResolver.getProjectPDs(projectId);
    for (const pd of pds) {
      await this.createNotification({
        projectId,
        recipientId: pd.userId,
        notificationType: NotificationType.EPISODE_COMPLETED,
        severity: AlertSeverity.INFO,
        title: `에피소드 ${episodeNumber} 완료`,
        message: `에피소드 ${episodeNumber}의 모든 작업이 완료되었습니다.`,
        metadata: { episodeNumber, completedAt, bufferStatus },
      });
    }
  }
}
