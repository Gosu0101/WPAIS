import { IsOptional, IsDateString, IsArray, IsIn, IsUUID } from 'class-validator';
import { Transform } from 'class-transformer';

export const CALENDAR_EVENT_TYPES = ['episode', 'milestone', 'task'] as const;
export type CalendarEventType = (typeof CALENDAR_EVENT_TYPES)[number];

export class CalendarEventsQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  projectIds?: string[];

  @IsOptional()
  @IsArray()
  @IsIn(CALENDAR_EVENT_TYPES, { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  types?: CalendarEventType[];
}

export class ProjectCalendarEventsQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsIn(CALENDAR_EVENT_TYPES, { each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  types?: CalendarEventType[];
}
