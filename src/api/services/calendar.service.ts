import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, In } from 'typeorm';
import { Episode } from '../../scheduling/entities/episode.entity';
import { Milestone } from '../../scheduling/entities/milestone.entity';
import { Project } from '../../scheduling/entities/project.entity';
import { Page } from '../../workflow/entities/page.entity';
import { TaskStatus, TaskType } from '../../workflow/types';
import {
  CalendarEventResponseDto,
  CalendarEventsResponseDto,
  CalendarProjectDto,
  EpisodeEventProps,
  MilestoneEventProps,
  TaskEventProps,
} from '../dto/calendar/calendar-event-response.dto';
import {
  CALENDAR_EVENT_TYPES,
  CalendarEventType,
} from '../dto/calendar/calendar-events-query.dto';

const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];

const EVENT_COLORS = {
  episode: {
    PENDING: '#6b7280',
    IN_PROGRESS: '#f59e0b',
    COMPLETED: '#22c55e',
    SEALED: '#8b5cf6',
  },
  milestone: {
    default: '#3b82f6',
    completed: '#22c55e',
    overdue: '#ef4444',
  },
  task: {
    LOCKED: '#374151',
    READY: '#3b82f6',
    IN_PROGRESS: '#f59e0b',
    DONE: '#22c55e',
  },
};

@Injectable()
export class CalendarService {
  constructor(
    @InjectRepository(Episode)
    private readonly episodeRepository: Repository<Episode>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
  ) {}

  async getEvents(
    startDate: Date,
    endDate: Date,
    projectIds?: string[],
    types?: CalendarEventType[],
  ): Promise<CalendarEventsResponseDto> {
    const projects = await this.getProjects(projectIds);
    const projectMap = new Map(projects.map((p, i) => [p.id, { ...p, color: PROJECT_COLORS[i % PROJECT_COLORS.length] }]));
    
    const events: CalendarEventResponseDto[] = [];
    const targetProjectIds = projectIds?.length ? projectIds : projects.map(p => p.id);
    const eventTypes = types?.length
      ? types
      : [...CALENDAR_EVENT_TYPES];

    if (eventTypes.includes('episode')) {
      const episodes = await this.getEpisodes(startDate, endDate, targetProjectIds);
      events.push(...episodes.map(e => this.mapEpisodeToEvent(e, projectMap.get(e.projectId))));
    }

    if (eventTypes.includes('milestone')) {
      const milestones = await this.getMilestones(startDate, endDate, targetProjectIds);
      events.push(...milestones.map(m => this.mapMilestoneToEvent(m, projectMap.get(m.projectId))));
    }

    if (eventTypes.includes('task')) {
      const tasks = await this.getTasks(startDate, endDate, targetProjectIds);
      events.push(...tasks);
    }

    return {
      events,
      projects: projects.map((p, i) => ({
        id: p.id,
        title: p.title,
        color: PROJECT_COLORS[i % PROJECT_COLORS.length],
      })),
    };
  }

  async getProjectEvents(
    projectId: string,
    startDate: Date,
    endDate: Date,
    types?: CalendarEventType[],
  ): Promise<CalendarEventsResponseDto> {
    return this.getEvents(startDate, endDate, [projectId], types);
  }

  async rescheduleEvent(
    eventId: string,
    eventType: CalendarEventType,
    newDate: Date,
  ): Promise<{ success: boolean; affectedEvents?: CalendarEventResponseDto[]; warnings?: string[] }> {
    const warnings: string[] = [];

    if (eventType === 'episode') {
      const episode = await this.episodeRepository.findOne({ where: { id: eventId } });
      if (!episode) {
        return { success: false, warnings: ['Episode not found'] };
      }
      
      if (episode.isSealed) {
        return { success: false, warnings: ['Cannot reschedule sealed episode'] };
      }

      episode.dueDate = newDate;
      await this.episodeRepository.save(episode);
      warnings.push('Episode rescheduled. Related schedules may need adjustment.');
    } else if (eventType === 'milestone') {
      const milestone = await this.milestoneRepository.findOne({ where: { id: eventId } });
      if (!milestone) {
        return { success: false, warnings: ['Milestone not found'] };
      }

      milestone.targetDate = newDate;
      await this.milestoneRepository.save(milestone);
    }

    return { success: true, warnings };
  }

  async getEventProjectId(
    eventId: string,
    eventType: CalendarEventType,
  ): Promise<string | null> {
    if (eventType === 'episode') {
      const episode = await this.episodeRepository.findOne({
        where: { id: eventId },
        select: ['projectId'],
      });
      return episode?.projectId ?? null;
    }

    if (eventType === 'milestone') {
      const milestone = await this.milestoneRepository.findOne({
        where: { id: eventId },
        select: ['projectId'],
      });
      return milestone?.projectId ?? null;
    }

    if (eventType === 'task') {
      const pageId = this.extractPageIdFromTaskEventId(eventId);
      if (!pageId) {
        return null;
      }

      const page = await this.pageRepository.findOne({
        where: { id: pageId },
        select: ['episodeId'],
      });

      if (!page) {
        return null;
      }

      const episode = await this.episodeRepository.findOne({
        where: { id: page.episodeId },
        select: ['projectId'],
      });
      return episode?.projectId ?? null;
    }

    return null;
  }

  private extractPageIdFromTaskEventId(eventId: string): string | null {
    for (const taskType of Object.values(TaskType)) {
      const suffix = `-${taskType}`;
      if (eventId.endsWith(suffix)) {
        return eventId.slice(0, -suffix.length);
      }
    }

    return null;
  }

  private async getProjects(projectIds?: string[]): Promise<Project[]> {
    if (projectIds?.length) {
      return this.projectRepository.find({ where: { id: In(projectIds) } });
    }
    return this.projectRepository.find();
  }

  private async getEpisodes(startDate: Date, endDate: Date, projectIds: string[]): Promise<Episode[]> {
    return this.episodeRepository.find({
      where: {
        projectId: In(projectIds),
        dueDate: Between(startDate, endDate),
      },
      relations: ['project'],
    });
  }

  private async getMilestones(startDate: Date, endDate: Date, projectIds: string[]): Promise<Milestone[]> {
    return this.milestoneRepository.find({
      where: {
        projectId: In(projectIds),
        targetDate: Between(startDate, endDate),
      },
      relations: ['project'],
    });
  }

  private async getTasks(startDate: Date, endDate: Date, projectIds: string[]): Promise<CalendarEventResponseDto[]> {
    // 성능 최적화: IN_PROGRESS 에피소드의 작업만 로드 (최대 50개 제한)
    const episodes = await this.episodeRepository.find({
      where: {
        projectId: In(projectIds),
        dueDate: Between(startDate, endDate),
        status: 'IN_PROGRESS' as any,
      },
      relations: ['project'],
      take: 10, // 최대 10개 에피소드만
    });

    const episodeIds = episodes.map(e => e.id);
    if (!episodeIds.length) return [];

    const pages = await this.pageRepository.find({
      where: { episodeId: In(episodeIds) },
      relations: ['episode'],
      take: 50, // 최대 50개 페이지만
    });

    const events: CalendarEventResponseDto[] = [];
    const episodeMap = new Map(episodes.map(e => [e.id, e]));

    for (const page of pages) {
      const episode = episodeMap.get(page.episodeId);
      if (!episode) continue;

      // IN_PROGRESS 또는 READY 상태의 작업만 표시
      const taskTypes: Array<{ 
        type: 'BACKGROUND' | 'LINE_ART' | 'COLORING' | 'POST_PROCESSING'; 
        status: TaskStatus;
        dueDate: Date | null;
      }> = [
        { type: 'BACKGROUND', status: page.backgroundStatus, dueDate: page.backgroundDueDate },
        { type: 'LINE_ART', status: page.lineArtStatus, dueDate: page.lineArtDueDate },
        { type: 'COLORING', status: page.coloringStatus, dueDate: page.coloringDueDate },
        { type: 'POST_PROCESSING', status: page.postProcessingStatus, dueDate: page.postProcessingDueDate },
      ];

      for (const task of taskTypes) {
        // LOCKED과 DONE 상태는 제외 (활성 작업만 표시)
        if (task.status === TaskStatus.LOCKED || task.status === TaskStatus.DONE) continue;

        // 공정별 마감일 사용 (없으면 에피소드 마감일 fallback)
        const taskDueDate = task.dueDate || episode.dueDate;

        events.push({
          id: `${page.id}-${task.type}`,
          title: `EP${episode.episodeNumber} P${page.pageNumber} ${this.getTaskTypeLabel(task.type)}`,
          start: taskDueDate.toISOString(),
          allDay: true,
          type: 'task',
          projectId: episode.projectId,
          projectTitle: episode.project?.title,
          color: EVENT_COLORS.task[task.status],
          extendedProps: {
            type: 'task',
            pageId: page.id,
            pageNumber: page.pageNumber,
            episodeNumber: episode.episodeNumber,
            taskType: task.type,
            status: task.status,
          } as TaskEventProps,
        });
      }
    }

    return events;
  }

  private mapEpisodeToEvent(episode: Episode, project?: CalendarProjectDto): CalendarEventResponseDto {
    const color = episode.isSealed
      ? EVENT_COLORS.episode.SEALED
      : EVENT_COLORS.episode[episode.status];

    return {
      id: episode.id,
      title: `EP${episode.episodeNumber} ${episode.isSealed ? '(봉인)' : ''}`,
      start: episode.dueDate.toISOString(),
      allDay: true,
      type: 'episode',
      projectId: episode.projectId,
      projectTitle: project?.title,
      color,
      extendedProps: {
        type: 'episode',
        episodeNumber: episode.episodeNumber,
        status: episode.status,
        isSealed: episode.isSealed,
      } as EpisodeEventProps,
    };
  }

  private mapMilestoneToEvent(milestone: Milestone, project?: CalendarProjectDto): CalendarEventResponseDto {
    const now = new Date();
    let color = EVENT_COLORS.milestone.default;
    
    if (milestone.isCompleted) {
      color = EVENT_COLORS.milestone.completed;
    } else if (milestone.targetDate < now) {
      color = EVENT_COLORS.milestone.overdue;
    }

    return {
      id: milestone.id,
      title: milestone.name,
      start: milestone.targetDate.toISOString(),
      allDay: true,
      type: 'milestone',
      projectId: milestone.projectId,
      projectTitle: project?.title,
      color,
      extendedProps: {
        type: 'milestone',
        milestoneType: milestone.type,
        isCompleted: milestone.isCompleted,
        completedAt: milestone.completedAt?.toISOString(),
      } as MilestoneEventProps,
    };
  }

  private getTaskTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      BACKGROUND: '배경',
      LINE_ART: '선화',
      COLORING: '채색',
      POST_PROCESSING: '후보정',
    };
    return labels[type] || type;
  }
}
