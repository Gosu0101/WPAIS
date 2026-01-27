import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectManagerService } from '../../scheduling/services';
import { MilestoneResponseDto } from '../dto/milestone';
import { ErrorResponseDto } from '../dto/common';

@ApiTags('milestones')
@Controller('api/projects/:projectId/milestones')
export class MilestoneController {
  constructor(
    private readonly projectManagerService: ProjectManagerService,
  ) {}

  @Get()
  @ApiOperation({ summary: '마일스톤 목록 조회', description: '프로젝트의 마일스톤 목록을 날짜순으로 조회합니다.' })
  @ApiParam({ name: 'projectId', description: '프로젝트 ID (UUID)' })
  @ApiResponse({ status: 200, description: '마일스톤 목록 조회 성공', type: [MilestoneResponseDto] })
  @ApiResponse({ status: 400, description: '잘못된 UUID 형식', type: ErrorResponseDto })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<MilestoneResponseDto[]> {
    const milestones = await this.projectManagerService.getMilestones(projectId);
    return milestones.map((m) => MilestoneResponseDto.fromEntity(m));
  }
}
