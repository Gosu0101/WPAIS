import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Episode } from '../../scheduling/entities';
import { Page } from '../../workflow/entities';
import { TaskStatus } from '../../workflow/types';
import { EpisodeResponseDto, EpisodeDetailResponseDto, EpisodeQueryDto } from '../dto/episode';
import { PageResponseDto } from '../dto/page';
import { ErrorResponseDto } from '../dto/common';

@ApiTags('episodes')
@Controller('api')
export class EpisodeController {
  constructor(
    @InjectRepository(Episode)
    private readonly episodeRepository: Repository<Episode>,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
  ) {}

  @Get('projects/:projectId/episodes')
  @ApiOperation({ summary: '에피소드 목록 조회', description: '프로젝트의 에피소드 목록을 조회합니다.' })
  @ApiParam({ name: 'projectId', description: '프로젝트 ID (UUID)' })
  @ApiResponse({ status: 200, description: '에피소드 목록 조회 성공', type: [EpisodeResponseDto] })
  @ApiResponse({ status: 400, description: '잘못된 UUID 형식', type: ErrorResponseDto })
  async findByProject(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Query() query: EpisodeQueryDto,
  ): Promise<EpisodeResponseDto[]> {
    const where: Record<string, unknown> = { projectId };
    if (query.status) {
      where.status = query.status;
    }

    const episodes = await this.episodeRepository.find({
      where,
      order: { episodeNumber: 'ASC' },
    });

    return episodes.map((e) => EpisodeResponseDto.fromEntity(e));
  }

  @Get('episodes/:id')
  @ApiOperation({ summary: '에피소드 상세 조회', description: '에피소드 ID로 상세 정보를 조회합니다. 페이지 목록을 포함합니다.' })
  @ApiParam({ name: 'id', description: '에피소드 ID (UUID)' })
  @ApiResponse({ status: 200, description: '에피소드 조회 성공', type: EpisodeDetailResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 UUID 형식', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: '에피소드를 찾을 수 없음', type: ErrorResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<EpisodeDetailResponseDto> {
    const episode = await this.episodeRepository.findOne({ where: { id } });
    if (!episode) {
      throw new NotFoundException(`Episode with ID ${id} not found`);
    }

    let pages = await this.pageRepository.find({
      where: { episodeId: id },
      order: { pageNumber: 'ASC' },
    });

    // 페이지가 없으면 자동 생성 (기존 데이터 마이그레이션 지원)
    if (pages.length === 0) {
      const newPages: Page[] = [];
      for (let pageNum = 1; pageNum <= 5; pageNum++) {
        const page = this.pageRepository.create({
          episodeId: id,
          pageNumber: pageNum,
          heightPx: 20000,
          backgroundStatus: TaskStatus.READY,
          lineArtStatus: TaskStatus.LOCKED,
          coloringStatus: TaskStatus.LOCKED,
          postProcessingStatus: TaskStatus.LOCKED,
        });
        newPages.push(page);
      }
      pages = await this.pageRepository.save(newPages);
    }

    const pageResponses = pages.map((p) => PageResponseDto.fromEntity(p));
    return EpisodeDetailResponseDto.fromEntityWithPages(episode, pageResponses);
  }
}
