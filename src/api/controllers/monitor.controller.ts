import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { MonitorService } from '../../monitor';
import {
  DashboardResponseDto,
  BufferStatusResponseDto,
  RiskResponseDto,
  VelocityResponseDto,
  HealthResponseDto,
  AlertQueryDto,
  VelocityQueryDto,
} from '../dto/monitor';
import { PaginatedResponse, ErrorResponseDto } from '../dto/common';
import {
  ProjectPermission,
  ProjectPermissionGuard,
  RequireProjectPermission,
} from '../../auth';

@ApiTags('monitor')
@Controller('projects/:projectId')
@UseGuards(ProjectPermissionGuard)
@RequireProjectPermission(ProjectPermission.VIEW)
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Get('dashboard')
  @ApiOperation({ summary: '대시보드 데이터 조회', description: '프로젝트의 전체 모니터링 대시보드 데이터를 조회합니다.' })
  @ApiParam({ name: 'projectId', description: '프로젝트 ID (UUID)' })
  @ApiResponse({ status: 200, description: '대시보드 조회 성공', type: DashboardResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 UUID 형식', type: ErrorResponseDto })
  async getDashboard(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<DashboardResponseDto> {
    const data = await this.monitorService.getDashboardData(projectId);
    return DashboardResponseDto.fromData(data);
  }

  @Get('buffer-status')
  @ApiOperation({ summary: '버퍼 상태 조회', description: '7+3 비축 전략의 버퍼 상태를 조회합니다.' })
  @ApiParam({ name: 'projectId', description: '프로젝트 ID (UUID)' })
  @ApiResponse({ status: 200, description: '버퍼 상태 조회 성공', type: BufferStatusResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 UUID 형식', type: ErrorResponseDto })
  async getBufferStatus(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<BufferStatusResponseDto> {
    const dashboard = await this.monitorService.getDashboardData(projectId);
    return dashboard.bufferStatus as BufferStatusResponseDto;
  }

  @Get('risk')
  @ApiOperation({ summary: '리스크 분석 조회', description: '프로젝트의 리스크 분석 결과를 조회합니다.' })
  @ApiParam({ name: 'projectId', description: '프로젝트 ID (UUID)' })
  @ApiResponse({ status: 200, description: '리스크 분석 조회 성공', type: RiskResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 UUID 형식', type: ErrorResponseDto })
  async getRisk(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<RiskResponseDto> {
    const dashboard = await this.monitorService.getDashboardData(projectId);
    return dashboard.risk as RiskResponseDto;
  }

  @Get('velocity')
  @ApiOperation({ summary: '속도 분석 조회', description: '제작 속도 분석 결과를 조회합니다. 트렌드 기간을 지정할 수 있습니다.' })
  @ApiParam({ name: 'projectId', description: '프로젝트 ID (UUID)' })
  @ApiResponse({ status: 200, description: '속도 분석 조회 성공', type: VelocityResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 UUID 형식', type: ErrorResponseDto })
  async getVelocity(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: VelocityQueryDto,
  ): Promise<{ velocity: VelocityResponseDto; trend: unknown }> {
    const dashboard = await this.monitorService.getDashboardData(projectId);
    const trend = await this.monitorService.getVelocityTrend(projectId, query.period || '7d');
    
    return {
      velocity: dashboard.velocity as VelocityResponseDto,
      trend,
    };
  }

  @Get('health')
  @ApiOperation({ summary: '건강 점검 조회', description: '프로젝트의 건강 점검 결과를 조회합니다.' })
  @ApiParam({ name: 'projectId', description: '프로젝트 ID (UUID)' })
  @ApiResponse({ status: 200, description: '건강 점검 조회 성공', type: HealthResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 UUID 형식', type: ErrorResponseDto })
  async getHealth(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<HealthResponseDto> {
    const dashboard = await this.monitorService.getDashboardData(projectId);
    return dashboard.health as HealthResponseDto;
  }

  @Get('alerts')
  @ApiOperation({ summary: '알림 히스토리 조회', description: '프로젝트의 알림 히스토리를 조회합니다. 날짜 범위 필터링과 페이지네이션을 지원합니다.' })
  @ApiParam({ name: 'projectId', description: '프로젝트 ID (UUID)' })
  @ApiResponse({ status: 200, description: '알림 히스토리 조회 성공' })
  @ApiResponse({ status: 400, description: '잘못된 UUID 형식', type: ErrorResponseDto })
  async getAlerts(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: AlertQueryDto,
  ): Promise<PaginatedResponse<unknown>> {
    const { page = 1, limit = 20, startDate, endDate, alertType, severity } = query;
    const offset = (page - 1) * limit;

    const { alerts, total } = await this.monitorService.getAlertHistory(projectId, {
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit,
      offset,
    });

    return PaginatedResponse.create(alerts, total, page, limit);
  }
}
