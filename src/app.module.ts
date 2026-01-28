import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from './config/config.module';
import { getDatabaseConfig } from './config/database.config';
import { SchedulingModule } from './scheduling';
import { WorkflowModule } from './workflow';
import { MonitorModule } from './monitor';
import { NotificationModule } from './notification';
import { AuthModule } from './auth';
import { ApiModule } from './api/api.module';

@Module({
  imports: [
    AppConfigModule,
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) =>
        getDatabaseConfig(configService),
      inject: [ConfigService],
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    SchedulingModule,
    WorkflowModule,
    MonitorModule,
    NotificationModule,
    AuthModule,
    ApiModule,
  ],
})
export class AppModule {}
