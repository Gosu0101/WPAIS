import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SchedulingModule } from './scheduling';
import { WorkflowModule } from './workflow';
import { MonitorModule } from './monitor';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    SchedulingModule,
    WorkflowModule,
    MonitorModule,
    ApiModule,
  ],
})
export class AppModule {}
