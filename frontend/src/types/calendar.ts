// Calendar View Types

export type CalendarEventType = 'episode' | 'milestone' | 'task';

export type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';

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

export interface CalendarEvent {
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

export interface CalendarFilter {
  eventTypes: CalendarEventType[];
  episodeStatuses: string[];
  taskTypes: string[];
  projectIds: string[];
}

export interface CalendarProject {
  id: string;
  title: string;
  color: string;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  projects: CalendarProject[];
}

export interface CalendarEventsQuery {
  startDate: string;
  endDate: string;
  projectIds?: string[];
  types?: CalendarEventType[];
}

export interface ProjectCalendarEventsQuery {
  startDate: string;
  endDate: string;
  types?: CalendarEventType[];
}

export interface RescheduleEventDto {
  newDate: string;
  eventType: CalendarEventType;
}

export interface RescheduleEventResponse {
  success: boolean;
  affectedEvents?: CalendarEvent[];
  warnings?: string[];
}
