import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from './config/config.module';
import { getDatabaseConfig } from './config/database.config';
import { SchedulingModule } from './scheduling';
import { WorkflowModule } from './workflow';
import { MonitorModule } from './monitor';
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
    SchedulingModule,
    WorkflowModule,
    MonitorModule,
    ApiModule,
  ],
})
export class AppModule {}
