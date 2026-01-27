import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
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
} from './controllers';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Episode, Milestone, Page]),
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
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class ApiModule {}
