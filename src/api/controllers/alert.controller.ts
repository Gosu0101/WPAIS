import {
  Controller,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { MonitorService } from '../../monitor/services/monitor.service';
import { ErrorResponseDto } from '../dto/common';

@ApiTags('alerts')
@Controller('alerts')
export class AlertController {
  constructor(private readonly monitorService: MonitorService) {}

  @Post(':alertId/acknowledge')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '알림 확인 처리', description: '알림을 확인 처리합니다.' })
  @ApiParam({ name: 'alertId', description: '알림 ID (UUID)' })
  @ApiResponse({ status: 200, description: '알림 확인 처리 성공' })
  @ApiResponse({ status: 404, description: '알림을 찾을 수 없음', type: ErrorResponseDto })
  async acknowledgeAlert(
    @Param('alertId', ParseUUIDPipe) alertId: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.monitorService.acknowledgeAlert(alertId);
    if (!result) {
      throw new NotFoundException(`Alert with ID ${alertId} not found`);
    }
    return { success: true, message: 'Alert acknowledged successfully' };
  }
}
