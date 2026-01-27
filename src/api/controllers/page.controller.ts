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
import { TaskType, TaskStatus } from '../../workflow/types';
import { InvalidStateTransitionError, LockedException } from '../../workflow/errors';
import { PageResponseDto } from '../dto/page';
import { ErrorResponseDto } from '../dto/common';
import { Episode, EpisodeStatus } from '../../scheduling/entities';

@ApiTags('pages')
@Controller('api/pages')
export class PageController {
  constructor(
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(Episode)
    private readonly episodeRepository: Repository<Episode>,
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

      // 에피소드 상태를 IN_PROGRESS로 업데이트 (아직 PENDING인 경우)
      await this.updateEpisodeStatusToInProgress(page.episodeId);

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

      // 모든 페이지가 완료되었는지 확인하고 에피소드 상태 업데이트
      await this.checkAndUpdateEpisodeCompletion(page.episodeId, episodePages);

      return PageResponseDto.fromEntity(updatedPage);
    } catch (error) {
      if (error instanceof InvalidStateTransitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private validateTaskType(taskType: string): TaskType {
    // camelCase를 SNAKE_CASE로 변환 (lineArt -> LINE_ART)
    const snakeCaseType = taskType
      .replace(/([A-Z])/g, '_$1')
      .toUpperCase();
    
    // 이미 대문자인 경우 그대로 사용
    const normalizedType = Object.values(TaskType).includes(taskType.toUpperCase() as TaskType)
      ? taskType.toUpperCase()
      : snakeCaseType;

    if (!Object.values(TaskType).includes(normalizedType as TaskType)) {
      throw new BadRequestException(
        `Invalid task type: ${taskType}. Valid types are: ${Object.values(TaskType).join(', ')}`,
      );
    }
    return normalizedType as TaskType;
  }

  /**
   * 에피소드 상태를 IN_PROGRESS로 업데이트 (PENDING인 경우에만)
   */
  private async updateEpisodeStatusToInProgress(episodeId: string): Promise<void> {
    const episode = await this.episodeRepository.findOne({ where: { id: episodeId } });
    if (episode && episode.status === EpisodeStatus.PENDING) {
      episode.status = EpisodeStatus.IN_PROGRESS;
      await this.episodeRepository.save(episode);
    }
  }

  /**
   * 모든 페이지의 모든 작업이 완료되었는지 확인하고 에피소드 상태를 COMPLETED로 업데이트
   */
  private async checkAndUpdateEpisodeCompletion(episodeId: string, pages: Page[]): Promise<void> {
    const allPagesCompleted = pages.every(page => 
      page.backgroundStatus === TaskStatus.DONE &&
      page.lineArtStatus === TaskStatus.DONE &&
      page.coloringStatus === TaskStatus.DONE &&
      page.postProcessingStatus === TaskStatus.DONE
    );

    if (allPagesCompleted) {
      const episode = await this.episodeRepository.findOne({ where: { id: episodeId } });
      if (episode && episode.status !== EpisodeStatus.COMPLETED) {
        episode.status = EpisodeStatus.COMPLETED;
        await this.episodeRepository.save(episode);
      }
    }
  }
}
