import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { IsArray, IsEnum, IsObject, IsOptional } from 'class-validator';
import { NotificationSettingService } from '../../notification/services/notification-setting.service';
import { NotificationType, NotificationThresholds } from '../../notification/types';
import {
  CurrentUser,
  JwtPayload,
  ProjectPermission,
  ProjectPermissionGuard,
  RequireProjectPermission,
} from '../../auth';

class UpdateSettingDto {
  @IsOptional()
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  enabledTypes?: NotificationType[];

  @IsOptional()
  @IsObject()
  thresholds?: Partial<NotificationThresholds>;
}

@Controller('projects/:projectId/notification-settings')
@UseGuards(ProjectPermissionGuard)
@RequireProjectPermission(ProjectPermission.VIEW)
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
    @CurrentUser() user: JwtPayload,
  ) {
    const setting = await this.settingService.getSetting(projectId, user.sub);
    return { data: setting };
  }

  /**
   * PATCH /api/projects/:id/notification-settings - 설정 변경
   */
  @Patch()
  async updateSetting(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpdateSettingDto,
  ) {
    const setting = await this.settingService.updateSetting(
      projectId,
      user.sub,
      dto,
    );
    return { success: true, data: setting };
  }
}
