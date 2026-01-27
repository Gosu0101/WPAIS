import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SchedulingModule } from './scheduling';
import { WorkflowModule } from './workflow';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    SchedulingModule,
    WorkflowModule,
    ApiModule,
  ],
})
export class AppModule {}
