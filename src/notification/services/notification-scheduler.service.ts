import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, IsNull, LessThanOrEqual } from 'typeorm';
import { Page } from '../../workflow/entities';
import { Episode, Milestone, Project } from '../../scheduling/entities';
import { EpisodeStatus } from '../../scheduling/entities/episode.entity';
import { Notification } from '../entities';
import { NotificationType, DEFAULT_THRESHOLDS } from '../types';
import { TaskStatus } from '../../workflow/types';
import { AlertSeverity } from '../../monitor/types';
import { RecipientResolverService } from './recipient-resolver.service';

@Injectable()
export class NotificationSchedulerService {
  private readonly logger = new Logger(NotificationSchedulerService.name);

  constructor(
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(Episode)
    private readonly episodeRepository: Repository<Episode>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
    private readonly recipientResolver: RecipientResolverService,
  ) {}

  /**
   * 매일 오전 9시에 마감 임박 체크
   */
  @Cron('0 9 * * *')
  async checkDeadlines(): Promise<void> {
    this.logger.log('Starting deadline check...');

    const projects = await this.projectRepository.find();

    for (const project of projects) {
      await this.checkTaskDeadlines(project.id);
      await this.checkEpisodeDeadlines(project.id);
      await this.checkMilestoneDeadlines(project.id);
    }

    this.logger.log('Deadline check completed');
  }


  /**
   * 공정 마감 체크
   */
  async checkTaskDeadlines(projectId: string): Promise<void> {
    const thresholds = DEFAULT_THRESHOLDS.task;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pages = await this.pageRepository.find({
      where: { episode: { projectId } },
      relations: ['episode'],
    });

    for (const page of pages) {
      await this.checkTaskDueDate(
        projectId,
        page,
        'backgroundStatus',
        'backgroundDueDate',
        'BACKGROUND',
        thresholds,
        today,
      );
      await this.checkTaskDueDate(
        projectId,
        page,
        'lineArtStatus',
        'lineArtDueDate',
        'LINE_ART',
        thresholds,
        today,
      );
      await this.checkTaskDueDate(
        projectId,
        page,
        'coloringStatus',
        'coloringDueDate',
        'COLORING',
        thresholds,
        today,
      );
      await this.checkTaskDueDate(
        projectId,
        page,
        'postProcessingStatus',
        'postProcessingDueDate',
        'POST_PROCESSING',
        thresholds,
        today,
      );
    }
  }

  private async checkTaskDueDate(
    projectId: string,
    page: Page,
    statusField: keyof Page,
    dueDateField: keyof Page,
    taskType: string,
    thresholds: number[],
    today: Date,
  ): Promise<void> {
    const status = page[statusField] as TaskStatus;
    const dueDate = page[dueDateField] as Date | null;

    if (status === TaskStatus.DONE || !dueDate) return;

    const daysRemaining = this.getDaysRemaining(today, dueDate);

    if (thresholds.includes(daysRemaining)) {
      await this.createDeadlineNotificationIfNotExists(
        projectId,
        NotificationType.TASK_DEADLINE_APPROACHING,
        {
          itemId: page.id,
          itemType: 'task',
          taskType,
          daysRemaining,
        },
        `${taskType} 마감 ${daysRemaining === 0 ? '당일' : `${daysRemaining}일 전`}`,
        `EP${page.episode.episodeNumber} P${page.pageNumber} ${taskType} 마감이 ${daysRemaining === 0 ? '오늘입니다' : `${daysRemaining}일 남았습니다`}.`,
        this.getSeverityByDays(daysRemaining),
      );
    }
  }


  /**
   * 에피소드 마감 체크
   */
  async checkEpisodeDeadlines(projectId: string): Promise<void> {
    const thresholds = DEFAULT_THRESHOLDS.episode;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const episodes = await this.episodeRepository.find({
      where: { projectId, status: Not(EpisodeStatus.COMPLETED) },
    });

    for (const episode of episodes) {
      const daysRemaining = this.getDaysRemaining(today, episode.dueDate);

      if (thresholds.includes(daysRemaining)) {
        await this.createDeadlineNotificationIfNotExists(
          projectId,
          NotificationType.EPISODE_DEADLINE_APPROACHING,
          {
            itemId: episode.id,
            itemType: 'episode',
            episodeNumber: episode.episodeNumber,
            daysRemaining,
          },
          `에피소드 ${episode.episodeNumber} 마감 ${daysRemaining}일 전`,
          `에피소드 ${episode.episodeNumber} 마감이 ${daysRemaining}일 남았습니다.`,
          this.getSeverityByDays(daysRemaining),
        );
      }
    }
  }

  /**
   * 마일스톤 마감 체크
   */
  async checkMilestoneDeadlines(projectId: string): Promise<void> {
    const thresholds = DEFAULT_THRESHOLDS.milestone;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const milestones = await this.milestoneRepository.find({
      where: { projectId, isCompleted: false },
    });

    for (const milestone of milestones) {
      const daysRemaining = this.getDaysRemaining(today, milestone.targetDate);

      if (thresholds.includes(daysRemaining)) {
        await this.createDeadlineNotificationIfNotExists(
          projectId,
          NotificationType.MILESTONE_DEADLINE_APPROACHING,
          {
            itemId: milestone.id,
            itemType: 'milestone',
            milestoneName: milestone.name,
            milestoneType: milestone.type,
            daysRemaining,
          },
          `마일스톤 "${milestone.name}" 마감 ${daysRemaining}일 전`,
          `마일스톤 "${milestone.name}" 마감이 ${daysRemaining}일 남았습니다.`,
          this.getSeverityByDays(daysRemaining),
        );
      }
    }
  }


  /**
   * 중복 알림 방지: 같은 항목/임계값 조합에 대해 1회만 알림
   */
  private async createDeadlineNotificationIfNotExists(
    projectId: string,
    notificationType: NotificationType,
    metadata: Record<string, unknown>,
    title: string,
    message: string,
    severity: AlertSeverity,
  ): Promise<void> {
    // 중복 체크: 같은 itemId + daysRemaining 조합이 이미 있는지 확인
    const existing = await this.notificationRepository
      .createQueryBuilder('n')
      .where('n.projectId = :projectId', { projectId })
      .andWhere('n.notificationType = :notificationType', { notificationType })
      .andWhere("JSON_EXTRACT(n.metadata, '$.itemId') = :itemId", {
        itemId: metadata.itemId,
      })
      .andWhere("JSON_EXTRACT(n.metadata, '$.daysRemaining') = :daysRemaining", {
        daysRemaining: metadata.daysRemaining,
      })
      .getOne();

    if (existing) {
      return; // 이미 알림이 존재하면 생성하지 않음
    }

    // PD들에게 알림 생성
    const pds = await this.recipientResolver.getProjectPDs(projectId);
    for (const pd of pds) {
      const notification = this.notificationRepository.create({
        projectId,
        recipientId: pd.userId,
        notificationType,
        severity,
        title,
        message,
        metadata,
        isRead: false,
        readAt: null,
      });
      await this.notificationRepository.save(notification);
    }
  }

  private getDaysRemaining(today: Date, targetDate: Date): number {
    const target = new Date(targetDate);
    target.setHours(0, 0, 0, 0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getSeverityByDays(daysRemaining: number): AlertSeverity {
    if (daysRemaining <= 0) return AlertSeverity.CRITICAL;
    if (daysRemaining <= 1) return AlertSeverity.ERROR;
    if (daysRemaining <= 3) return AlertSeverity.WARNING;
    return AlertSeverity.INFO;
  }
}
