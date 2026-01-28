import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  Notification,
  ProjectMember,
  NotificationSetting,
} from './entities';
import {
  NotificationService,
  NotificationSchedulerService,
  NotificationSettingService,
  RecipientResolverService,
  NotificationEventListenerService,
} from './services';
import { Page } from '../workflow/entities';
import { Episode, Milestone, Project } from '../scheduling/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Notification,
      ProjectMember,
      NotificationSetting,
      Page,
      Episode,
      Milestone,
      Project,
    ]),
  ],
  providers: [
    NotificationService,
    NotificationSchedulerService,
    NotificationSettingService,
    RecipientResolverService,
    NotificationEventListenerService,
  ],
  exports: [
    NotificationService,
    NotificationSettingService,
    RecipientResolverService,
  ],
})
export class NotificationModule {}
