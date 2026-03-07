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
import { CurrentUser, JwtPayload } from '../../auth';
import {
  NotificationProjectQueryDto,
  NotificationQueryDto,
} from '../dto/notification';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  /**
   * GET /api/notifications - 내 알림 목록
   */
  @Get()
  async getNotifications(
    @CurrentUser() user: JwtPayload,
    @Query() query: NotificationQueryDto,
  ) {
    const options = {
      recipientId: user.sub,
      projectId: query.projectId,
      notificationType: query.notificationType,
      severity: query.severity,
      isRead: query.isRead,
    };

    const result = await this.notificationService.getNotifications(
      options,
      query.page ?? 1,
      query.limit ?? 20,
    );

    return {
      data: result.data,
      total: result.total,
      page: query.page ?? 1,
      limit: query.limit ?? 20,
    };
  }


  /**
   * GET /api/notifications/unread-count - 미확인 알림 수
   */
  @Get('unread-count')
  async getUnreadCount(
    @CurrentUser() user: JwtPayload,
    @Query() query: NotificationProjectQueryDto,
  ) {
    return this.notificationService.getUnreadCount(user.sub, query.projectId);
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
    @CurrentUser() user: JwtPayload,
    @Query() query: NotificationProjectQueryDto,
  ) {
    const count = await this.notificationService.markAllAsRead(
      user.sub,
      query.projectId,
    );
    return { success: true, updatedCount: count };
  }
}
