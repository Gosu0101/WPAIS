import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { NotificationService } from '../../notification/services/notification.service';
import { NotificationType } from '../../notification/types';
import { AlertSeverity } from '../../monitor/types';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /api/notifications - 내 알림 목록
   */
  @Get()
  async getNotifications(
    @Query('recipientId', ParseUUIDPipe) recipientId: string,
    @Query('projectId') projectId?: string,
    @Query('notificationType') notificationType?: NotificationType,
    @Query('severity') severity?: AlertSeverity,
    @Query('isRead') isRead?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const options = {
      recipientId,
      projectId,
      notificationType,
      severity,
      isRead: isRead !== undefined ? isRead === 'true' : undefined,
    };

    const result = await this.notificationService.getNotifications(
      options,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
    );

    return {
      data: result.data,
      total: result.total,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    };
  }


  /**
   * GET /api/notifications/unread-count - 미확인 알림 수
   */
  @Get('unread-count')
  async getUnreadCount(
    @Query('recipientId', ParseUUIDPipe) recipientId: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.notificationService.getUnreadCount(recipientId, projectId);
  }

  /**
   * POST /api/notifications/:id/read - 알림 확인 처리
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id', ParseUUIDPipe) id: string) {
    const notification = await this.notificationService.markAsRead(id);
    if (!notification) {
      return { success: false, message: 'Notification not found' };
    }
    return { success: true, notification };
  }

  /**
   * POST /api/notifications/read-all - 전체 확인 처리
   */
  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(
    @Query('recipientId', ParseUUIDPipe) recipientId: string,
    @Query('projectId') projectId?: string,
  ) {
    const count = await this.notificationService.markAllAsRead(
      recipientId,
      projectId,
    );
    return { success: true, updatedCount: count };
  }
}
