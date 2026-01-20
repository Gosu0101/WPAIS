import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Project } from './entities/project.entity';
import { Episode } from './entities/episode.entity';
import { Milestone } from './entities/milestone.entity';
import { VelocityConfigService } from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([Project, Episode, Milestone]),
  ],
  providers: [VelocityConfigService],
  exports: [VelocityConfigService],
})
export class SchedulingModule {}
