import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Episode } from './entities/episode.entity';
import { Milestone } from './entities/milestone.entity';
import { VelocityConfigService, SchedulerService, ProjectManagerService } from './services';
import { WorkflowModule } from '../workflow/workflow.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Episode, Milestone]),
    WorkflowModule,
  ],
  providers: [VelocityConfigService, SchedulerService, ProjectManagerService],
  exports: [VelocityConfigService, SchedulerService, ProjectManagerService],
})
export class SchedulingModule {}
