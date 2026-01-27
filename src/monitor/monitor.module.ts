import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ProgressSnapshot, Alert } from './entities';
import { Episode, Project } from '../scheduling';
import { Page } from '../workflow';
import {
  BufferStatusService,
  RiskAnalyzerService,
  ProgressService,
  VelocityAnalyzerService,
  AlertService,
  SealCountdownService,
  HealthCheckService,
  HistoryService,
  MonitorService,
} from './services';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgressSnapshot,
      Alert,
      Episode,
      Project,
      Page,
    ]),
    EventEmitterModule.forRoot(),
  ],
  providers: [
    BufferStatusService,
    RiskAnalyzerService,
    ProgressService,
    VelocityAnalyzerService,
    AlertService,
    SealCountdownService,
    HealthCheckService,
    HistoryService,
    MonitorService,
  ],
  exports: [
    MonitorService,
    BufferStatusService,
    RiskAnalyzerService,
    ProgressService,
    VelocityAnalyzerService,
    AlertService,
    SealCountdownService,
    HealthCheckService,
    HistoryService,
  ],
})
export class MonitorModule {}
