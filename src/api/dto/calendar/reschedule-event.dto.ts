import { IsDateString, IsIn } from 'class-validator';
import { CALENDAR_EVENT_TYPES, CalendarEventType } from './calendar-events-query.dto';
import { CalendarEventResponseDto } from './calendar-event-response.dto';

export class RescheduleEventDto {
  @IsDateString()
  newDate: string;

  @IsIn(CALENDAR_EVENT_TYPES)
  eventType: CalendarEventType;
}

export class RescheduleEventResponseDto {
  success: boolean;
  affectedEvents?: CalendarEventResponseDto[];
  warnings?: string[];
}
