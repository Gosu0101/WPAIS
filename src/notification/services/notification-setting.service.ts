import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationSetting } from '../entities';
import {
  NotificationType,
  NotificationThresholds,
  DEFAULT_THRESHOLDS,
} from '../types';

@Injectable()
export class NotificationSettingService {
  constructor(
    @InjectRepository(NotificationSetting)
    private readonly settingRepository: Repository<NotificationSetting>,
  ) {}

  async getSetting(
    projectId: string,
    userId: string,
  ): Promise<NotificationSetting> {
    let setting = await this.settingRepository.findOne({
      where: { projectId, userId },
    });

    if (!setting) {
      // 기본 설정 생성
      setting = this.settingRepository.create({
        projectId,
        userId,
        enabledTypes: Object.values(NotificationType),
        thresholds: DEFAULT_THRESHOLDS,
      });
      setting = await this.settingRepository.save(setting);
    }

    return setting;
  }

  async updateSetting(
    projectId: string,
    userId: string,
    updates: {
      enabledTypes?: NotificationType[];
      thresholds?: Partial<NotificationThresholds>;
    },
  ): Promise<NotificationSetting> {
    let setting = await this.getSetting(projectId, userId);

    if (updates.enabledTypes) {
      setting.enabledTypes = updates.enabledTypes;
    }

    if (updates.thresholds) {
      setting.thresholds = {
        ...setting.thresholds,
        ...updates.thresholds,
      };
    }

    return this.settingRepository.save(setting);
  }
}
