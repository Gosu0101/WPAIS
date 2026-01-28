import { IsOptional, IsDateString, IsArray, IsString, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export type CalendarEventType = 'episode' | 'milestone' | 'task';

export class CalendarEventsQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  projectIds?: string[];

  @IsOptional()
  @IsArray()
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
  @Transform(({ value }) => (typeof value === 'string' ? [value] : value))
  types?: CalendarEventType[];
}
