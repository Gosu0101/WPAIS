import { IsDateString, IsEnum, IsString } from 'class-validator';
import { CalendarEventType } from './calendar-events-query.dto';
import { CalendarEventResponseDto } from './calendar-event-response.dto';

export class RescheduleEventDto {
  @IsDateString()
  newDate: string;

  @IsString()
  eventType: CalendarEventType;
}

export class RescheduleEventResponseDto {
  success: boolean;
  affectedEvents?: CalendarEventResponseDto[];
  warnings?: string[];
}
