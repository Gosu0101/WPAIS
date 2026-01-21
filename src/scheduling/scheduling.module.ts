import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Episode } from './entities/episode.entity';
import { Milestone } from './entities/milestone.entity';
import { VelocityConfigService, SchedulerService, ProjectManagerService } from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Episode, Milestone]),
  ],
  providers: [VelocityConfigService, SchedulerService, ProjectManagerService],
  exports: [VelocityConfigService, SchedulerService, ProjectManagerService],
})
export class SchedulingModule {}
