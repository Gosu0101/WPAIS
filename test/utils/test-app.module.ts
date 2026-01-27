import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Project, Episode, Milestone } from '../../src/scheduling/entities';
import { Page } from '../../src/workflow/entities/page.entity';
import { Alert, ProgressSnapshot } from '../../src/monitor/entities';
import { SchedulingModule } from '../../src/scheduling/scheduling.module';
import { WorkflowModule } from '../../src/workflow/workflow.module';
import { MonitorModule } from '../../src/monitor/monitor.module';

/**
 * TestAppModule
 * E2E 및 통합 테스트를 위한 테스트 전용 모듈
 * In-memory SQLite 데이터베이스 사용
 */
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [Project, Episode, Milestone, Page, Alert, ProgressSnapshot],
      synchronize: true,
      dropSchema: true,
    }),
    EventEmitterModule.forRoot(),
    SchedulingModule,
    WorkflowModule,
    MonitorModule,
  ],
})
export class TestAppModule {}
