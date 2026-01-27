import {
  Controller,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { MonitorService } from '../../monitor/services/monitor.service';

@Controller('api/alerts')
export class AlertController {
  constructor(private readonly monitorService: MonitorService) {}

  @Post(':alertId/acknowledge')
  @HttpCode(HttpStatus.OK)
  async acknowledgeAlert(
    @Param('alertId') alertId: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.monitorService.acknowledgeAlert(alertId);
    if (!result) {
      throw new NotFoundException(`Alert with ID ${alertId} not found`);
    }
    return { success: true, message: 'Alert acknowledged successfully' };
  }
}
