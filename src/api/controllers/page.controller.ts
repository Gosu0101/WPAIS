import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Page } from '../../workflow/entities';
import { WorkflowEngineService } from '../../workflow/services';
import { TaskType } from '../../workflow/types';
import { InvalidStateTransitionError, LockedException } from '../../workflow/errors';
import { PageResponseDto } from '../dto/page';
import { ErrorResponseDto } from '../dto/common';

@ApiTags('pages')
@Controller('api/pages')
export class PageController {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    private readonly workflowEngineService: WorkflowEngineService,
  ) {}

  @Get(':id')
  @ApiOperation({ summary: '페이지 상세 조회', description: '페이지 ID로 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'id', description: '페이지 ID (UUID)' })
  @ApiResponse({ status: 200, description: '페이지 조회 성공', type: PageResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 UUID 형식', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: '페이지를 찾을 수 없음', type: ErrorResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PageResponseDto> {
    const page = await this.pageRepository.findOne({ where: { id } });
    if (!page) {
      throw new NotFoundException(`Page with ID ${id} not found`);
    }
    return PageResponseDto.fromEntity(page);
  }

  @Post(':pageId/tasks/:taskType/start')
  @ApiOperation({ summary: '작업 시작', description: '페이지의 특정 작업을 시작합니다. READY → IN_PROGRESS 상태 전이.' })
  @ApiParam({ name: 'pageId', description: '페이지 ID (UUID)' })
  @ApiParam({ name: 'taskType', description: '작업 유형', enum: TaskType })
  @ApiResponse({ status: 200, description: '작업 시작 성공', type: PageResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 또는 상태 전이 오류', type: ErrorResponseDto })
  @ApiResponse({ status: 403, description: '의존성 미충족 (LOCKED 상태)', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: '페이지를 찾을 수 없음', type: ErrorResponseDto })
  async startTask(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Param('taskType') taskType: string,
  ): Promise<PageResponseDto> {
    const validTaskType = this.validateTaskType(taskType);

    const page = await this.pageRepository.findOne({ where: { id: pageId } });
    if (!page) {
      throw new NotFoundException(`Page with ID ${pageId} not found`);
    }

    try {
      const updatedPage = this.workflowEngineService.startTask(page, validTaskType);
      await this.pageRepository.save(updatedPage);
      return PageResponseDto.fromEntity(updatedPage);
    } catch (error) {
      if (error instanceof LockedException) {
        throw new ForbiddenException(error.message);
      }
      if (error instanceof InvalidStateTransitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  @Post(':pageId/tasks/:taskType/complete')
  @ApiOperation({ summary: '작업 완료', description: '페이지의 특정 작업을 완료합니다. IN_PROGRESS → DONE 상태 전이. 다음 공정이 자동으로 잠금 해제됩니다.' })
  @ApiParam({ name: 'pageId', description: '페이지 ID (UUID)' })
  @ApiParam({ name: 'taskType', description: '작업 유형', enum: TaskType })
  @ApiResponse({ status: 200, description: '작업 완료 성공', type: PageResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청 또는 상태 전이 오류', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: '페이지를 찾을 수 없음', type: ErrorResponseDto })
  async completeTask(
    @Param('pageId', ParseUUIDPipe) pageId: string,
    @Param('taskType') taskType: string,
  ): Promise<PageResponseDto> {
    const validTaskType = this.validateTaskType(taskType);

    const page = await this.pageRepository.findOne({ where: { id: pageId } });
    if (!page) {
      throw new NotFoundException(`Page with ID ${pageId} not found`);
    }

    try {
      const updatedPage = this.workflowEngineService.completeTask(page, validTaskType);
      await this.pageRepository.save(updatedPage);

      const episodePages = await this.pageRepository.find({
        where: { episodeId: page.episodeId },
      });
      this.workflowEngineService.checkAndEmitEpisodeCompleted(page.episodeId, episodePages);

      return PageResponseDto.fromEntity(updatedPage);
    } catch (error) {
      if (error instanceof InvalidStateTransitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private validateTaskType(taskType: string): TaskType {
    const upperTaskType = taskType.toUpperCase();
    if (!Object.values(TaskType).includes(upperTaskType as TaskType)) {
      throw new BadRequestException(
        `Invalid task type: ${taskType}. Valid types are: ${Object.values(TaskType).join(', ')}`,
      );
    }
    return upperTaskType as TaskType;
  }
}
