import { CalendarEventType } from './calendar-events-query.dto';

export interface EpisodeEventProps {
  type: 'episode';
  episodeNumber: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  isSealed: boolean;
  progress?: number;
}

export interface MilestoneEventProps {
  type: 'milestone';
  milestoneType: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface TaskEventProps {
  type: 'task';
  pageId: string;
  pageNumber: number;
  episodeNumber: number;
  taskType: 'BACKGROUND' | 'LINE_ART' | 'COLORING' | 'POST_PROCESSING';
  status: 'LOCKED' | 'READY' | 'IN_PROGRESS' | 'DONE';
}

export type CalendarEventExtendedProps = EpisodeEventProps | MilestoneEventProps | TaskEventProps;

export class CalendarEventResponseDto {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  type: CalendarEventType;
  projectId: string;
  projectTitle?: string;
  color?: string;
  extendedProps: CalendarEventExtendedProps;
}

export class CalendarProjectDto {
  id: string;
  title: string;
  color: string;
}

export class CalendarEventsResponseDto {
  events: CalendarEventResponseDto[];
  projects: CalendarProjectDto[];
}
