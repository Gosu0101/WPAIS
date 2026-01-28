import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  ParseUUIDPipe,
} from '@nestjs/common';
import { NotificationSettingService } from '../../notification/services/notification-setting.service';
import { NotificationType, NotificationThresholds } from '../../notification/types';

class UpdateSettingDto {
  enabledTypes?: NotificationType[];
  thresholds?: Partial<NotificationThresholds>;
}

@Controller('projects/:projectId/notification-settings')
export class NotificationSettingController {
  constructor(
    private readonly settingService: NotificationSettingService,
  ) {}

  /**
   * GET /api/projects/:id/notification-settings - 설정 조회
   */
  @Get()
  async getSetting(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('userId', ParseUUIDPipe) userId: string,
  ) {
    const setting = await this.settingService.getSetting(projectId, userId);
    return { data: setting };
  }

  /**
   * PATCH /api/projects/:id/notification-settings - 설정 변경
   */
  @Patch()
  async updateSetting(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query('userId', ParseUUIDPipe) userId: string,
    @Body() dto: UpdateSettingDto,
  ) {
    const setting = await this.settingService.updateSetting(
      projectId,
      userId,
      dto,
    );
    return { success: true, data: setting };
  }
}
