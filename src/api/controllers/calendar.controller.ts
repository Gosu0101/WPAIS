import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import { CalendarService } from '../services/calendar.service';
import { CalendarEventsQueryDto, ProjectCalendarEventsQueryDto } from '../dto/calendar/calendar-events-query.dto';
import { RescheduleEventDto, RescheduleEventResponseDto } from '../dto/calendar/reschedule-event.dto';
import { CalendarEventsResponseDto } from '../dto/calendar/calendar-event-response.dto';
import {
  CurrentUser,
  JwtPayload,
  ProjectPermission,
  ProjectPermissionGuard,
  RequireProjectPermission,
  SystemRole,
} from '../../auth';
import { RecipientResolverService } from '../../notification/services/recipient-resolver.service';
import { MemberRole } from '../../notification/types';

@Controller('calendar')
export class CalendarController {
  constructor(
    private readonly calendarService: CalendarService,
    private readonly recipientResolver: RecipientResolverService,
  ) {}

  @Get('events')
  async getEvents(
    @CurrentUser() user: JwtPayload,
    @Query() query: CalendarEventsQueryDto,
  ): Promise<CalendarEventsResponseDto> {
    const projectIds =
      user.systemRole === SystemRole.ADMIN
        ? query.projectIds
        : await this.recipientResolver.filterAccessibleProjectIds(
            user.sub,
            query.projectIds,
          );

    return this.calendarService.getEvents(
      new Date(query.startDate),
      new Date(query.endDate),
      projectIds,
      query.types,
    );
  }

  @Patch('events/:id/reschedule')
  async rescheduleEvent(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RescheduleEventDto,
  ): Promise<RescheduleEventResponseDto> {
    if (user.systemRole !== SystemRole.ADMIN) {
      const projectId = await this.calendarService.getEventProjectId(
        id,
        dto.eventType,
      );

      if (!projectId) {
        throw new ForbiddenException('캘린더 이벤트에 접근할 수 없습니다.');
      }

      const membership = await this.recipientResolver.getProjectMembership(
        projectId,
        user.sub,
      );

      if (!membership) {
        throw new ForbiddenException('프로젝트에 접근 권한이 없습니다.');
      }

      if (membership.role !== MemberRole.PD) {
        throw new ForbiddenException('일정 변경 권한이 없습니다.');
      }
    }

    return this.calendarService.rescheduleEvent(id, dto.eventType, new Date(dto.newDate));
  }
}

@Controller('projects/:projectId/calendar')
@UseGuards(ProjectPermissionGuard)
@RequireProjectPermission(ProjectPermission.VIEW)
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
