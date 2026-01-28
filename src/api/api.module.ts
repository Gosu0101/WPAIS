import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { SchedulingModule, Project, Episode, Milestone } from '../scheduling';
import { WorkflowModule, Page } from '../workflow';
import { MonitorModule } from '../monitor';
import { NotificationModule } from '../notification';
import { AuthModule, JwtAuthGuard } from '../auth';
import { HttpExceptionFilter } from './filters';
import {
  ProjectController,
  EpisodeController,
  PageController,
  MilestoneController,
  MonitorController,
  HealthController,
  AlertController,
} from './controllers';
import { CalendarController, ProjectCalendarController } from './controllers/calendar.controller';
import { NotificationController } from './controllers/notification.controller';
import { ProjectMemberController } from './controllers/project-member.controller';
import { NotificationSettingController } from './controllers/notification-setting.controller';
import { CalendarService } from './services/calendar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Episode, Milestone, Page]),
    TerminusModule,
    SchedulingModule,
    WorkflowModule,
    MonitorModule,
    NotificationModule,
    AuthModule,
  ],
  controllers: [
    ProjectController,
    EpisodeController,
    PageController,
    MilestoneController,
    MonitorController,
    HealthController,
    AlertController,
    CalendarController,
    ProjectCalendarController,
    NotificationController,
    ProjectMemberController,
    NotificationSettingController,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    CalendarService,
  ],
})
export class ApiModule {}
