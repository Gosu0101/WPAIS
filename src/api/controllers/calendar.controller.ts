import { Controller, Get, Patch, Param, Query, Body, ParseUUIDPipe } from '@nestjs/common';
import { CalendarService } from '../services/calendar.service';
import { CalendarEventsQueryDto, ProjectCalendarEventsQueryDto } from '../dto/calendar/calendar-events-query.dto';
import { RescheduleEventDto, RescheduleEventResponseDto } from '../dto/calendar/reschedule-event.dto';
import { CalendarEventsResponseDto } from '../dto/calendar/calendar-event-response.dto';

@Controller('calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  async getEvents(@Query() query: CalendarEventsQueryDto): Promise<CalendarEventsResponseDto> {
    return this.calendarService.getEvents(
      new Date(query.startDate),
      new Date(query.endDate),
      query.projectIds,
      query.types,
    );
  }

  @Patch('events/:id/reschedule')
  async rescheduleEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleEventDto,
  ): Promise<RescheduleEventResponseDto> {
    return this.calendarService.rescheduleEvent(id, dto.eventType, new Date(dto.newDate));
  }
}

@Controller('projects/:projectId/calendar')
export class ProjectCalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('events')
  async getProjectEvents(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: ProjectCalendarEventsQueryDto,
  ): Promise<CalendarEventsResponseDto> {
    return this.calendarService.getProjectEvents(
      projectId,
      new Date(query.startDate),
      new Date(query.endDate),
      query.types,
    );
  }
}
