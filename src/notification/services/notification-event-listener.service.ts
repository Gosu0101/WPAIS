import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationService } from './notification.service';
import { Page } from '../../workflow/entities';
import { Episode } from '../../scheduling/entities';
import { WORKFLOW_EVENTS, EpisodeCompletedEvent } from '../../workflow/types';
import { TaskType } from '../../workflow/types';

/**
 * 작업 완료 이벤트 (커스텀)
 */
export interface TaskCompletedEvent {
  pageId: string;
  taskType: TaskType;
  timestamp: Date;
}

export const TASK_COMPLETED_EVENT = 'workflow.task.completed';
export const TASK_STARTED_EVENT = 'workflow.task.started';

@Injectable()
export class NotificationEventListenerService {
  constructor(
    private readonly notificationService: NotificationService,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(Episode)
    private readonly episodeRepository: Repository<Episode>,
  ) {}

  /**
   * 작업 완료 이벤트 수신
   */
  @OnEvent(TASK_COMPLETED_EVENT)
  async handleTaskCompleted(event: TaskCompletedEvent): Promise<void> {
    const page = await this.pageRepository.findOne({
      where: { id: event.pageId },
      relations: ['episode'],
    });

    if (!page) return;

    await this.notificationService.notifyTaskCompleted({
      projectId: page.episode.projectId,
      episodeNumber: page.episode.episodeNumber,
      pageNumber: page.pageNumber,
      taskType: event.taskType,
    });
  }


  /**
   * 작업 시작 이벤트 수신
   */
  @OnEvent(TASK_STARTED_EVENT)
  async handleTaskStarted(event: TaskCompletedEvent): Promise<void> {
    const page = await this.pageRepository.findOne({
      where: { id: event.pageId },
      relations: ['episode'],
    });

    if (!page) return;

    await this.notificationService.notifyTaskStarted({
      projectId: page.episode.projectId,
      episodeNumber: page.episode.episodeNumber,
      pageNumber: page.pageNumber,
      taskType: event.taskType,
    });
  }

  /**
   * 에피소드 완료 이벤트 수신
   */
  @OnEvent(WORKFLOW_EVENTS.EPISODE_COMPLETED)
  async handleEpisodeCompleted(event: EpisodeCompletedEvent): Promise<void> {
    const episode = await this.episodeRepository.findOne({
      where: { id: event.episodeId },
    });

    if (!episode) return;

    await this.notificationService.notifyEpisodeCompleted({
      projectId: episode.projectId,
      episodeNumber: episode.episodeNumber,
      completedAt: event.completedAt,
    });
  }
}
