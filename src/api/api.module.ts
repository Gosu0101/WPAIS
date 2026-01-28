import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TerminusModule } from '@nestjs/terminus';
import { SchedulingModule, Project, Episode, Milestone } from '../scheduling';
import { WorkflowModule, Page } from '../workflow';
import { MonitorModule } from '../monitor';
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
import { CalendarService } from './services/calendar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Episode, Milestone, Page]),
    TerminusModule,
    SchedulingModule,
    WorkflowModule,
    MonitorModule,
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
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    CalendarService,
  ],
})
export class ApiModule {}
