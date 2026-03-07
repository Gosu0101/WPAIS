import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  NotFoundException,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ProjectManagerService } from '../../scheduling/services';
import {
  CreateProjectDto,
  UpdateProjectDto,
  ProjectResponseDto,
  ProjectQueryDto,
} from '../dto/project';
import { PaginatedResponse, ErrorResponseDto } from '../dto/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { Project } from '../../scheduling/entities';
import {
  ProjectPermissionGuard,
  RequireProjectPermission,
  ProjectPermission,
  CurrentUser,
  JwtPayload,
  SystemRole,
} from '../../auth';
import { ProjectMember } from '../../notification/entities/project-member.entity';
import { MemberRole } from '../../notification/types';

@ApiTags('projects')
@Controller('projects')
export class ProjectController {
  constructor(
    private readonly projectManagerService: ProjectManagerService,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '프로젝트 생성', description: '새 웹툰 프로젝트를 생성하고 마스터 스케줄을 자동 계산합니다.' })
  @ApiResponse({ status: 201, description: '프로젝트 생성 성공', type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청', type: ErrorResponseDto })
  async create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectResponseDto> {
    const project = await this.projectManagerService.createProject({
      title: dto.title,
      launchDate: new Date(dto.launchDate),
      episodeCount: dto.episodeCount,
      velocityConfig: dto.velocityConfig,
    });

    // 생성자를 PD로 자동 추가
    const member = this.memberRepository.create({
      projectId: project.id,
      userId: user.sub,
      role: MemberRole.PD,
      taskType: null,
    });
    await this.memberRepository.save(member);

    return ProjectResponseDto.fromEntity(project);
  }

  @Get()
  @ApiOperation({ summary: '프로젝트 목록 조회', description: '사용자가 멤버인 프로젝트 목록을 페이지네이션하여 조회합니다.' })
  @ApiResponse({ status: 200, description: '프로젝트 목록 조회 성공' })
  async findAll(
    @Query() query: ProjectQueryDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<PaginatedResponse<ProjectResponseDto>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'DESC', title } = query;
    const skip = (page - 1) * limit;

    // ADMIN은 모든 프로젝트 조회 가능
    if (user.systemRole === SystemRole.ADMIN) {
      const where: Record<string, unknown> = {};
      if (title) {
        where.title = Like(`%${title}%`);
      }

      const [projects, total] = await this.projectRepository.findAndCount({
        where,
        order: { [sortBy]: sortOrder },
        skip,
        take: limit,
      });

      const data = projects.map((p) => ProjectResponseDto.fromEntity(p));
      return PaginatedResponse.create(data, total, page, limit);
    }

    // 일반 사용자는 멤버인 프로젝트만 조회
    const memberships = await this.memberRepository.find({
      where: { userId: user.sub },
      select: ['projectId'],
    });

    if (memberships.length === 0) {
      return PaginatedResponse.create([], 0, page, limit);
    }

    const projectIds = memberships.map((m) => m.projectId);
    const where: Record<string, unknown> = { id: In(projectIds) };
    if (title) {
      where.title = Like(`%${title}%`);
    }

    const [projects, total] = await this.projectRepository.findAndCount({
      where,
      order: { [sortBy]: sortOrder },
      skip,
      take: limit,
    });

    const data = projects.map((p) => ProjectResponseDto.fromEntity(p));
    return PaginatedResponse.create(data, total, page, limit);
  }

  @Get(':id')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectPermission.VIEW)
  @ApiOperation({ summary: '프로젝트 상세 조회', description: '프로젝트 ID로 상세 정보를 조회합니다.' })
  @ApiParam({ name: 'id', description: '프로젝트 ID (UUID)' })
  @ApiResponse({ status: 200, description: '프로젝트 조회 성공', type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 UUID 형식', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: '프로젝트를 찾을 수 없음', type: ErrorResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ProjectResponseDto> {
    const project = await this.projectManagerService.getProject(id);
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    return ProjectResponseDto.fromEntity(project);
  }

  @Patch(':id')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectPermission.EDIT)
  @ApiOperation({ summary: '프로젝트 수정', description: '프로젝트 정보를 수정합니다. 런칭일 변경 시 스케줄이 재계산됩니다.' })
  @ApiParam({ name: 'id', description: '프로젝트 ID (UUID)' })
  @ApiResponse({ status: 200, description: '프로젝트 수정 성공', type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: '잘못된 요청', type: ErrorResponseDto })
  @ApiResponse({ status: 404, description: '프로젝트를 찾을 수 없음', type: ErrorResponseDto })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    const existingProject = await this.projectManagerService.getProject(id);
    if (!existingProject) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    let project = existingProject;

    if (dto.launchDate) {
      project = await this.projectManagerService.updateLaunchDate(id, new Date(dto.launchDate));
    }

    if (dto.title) {
      project.title = dto.title;
      await this.projectRepository.save(project);
    }

    return ProjectResponseDto.fromEntity(project);
  }

  @Delete(':id')
  @UseGuards(ProjectPermissionGuard)
  @RequireProjectPermission(ProjectPermission.EDIT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: '프로젝트 삭제', description: '프로젝트를 삭제합니다.' })
  @ApiParam({ name: 'id', description: '프로젝트 ID (UUID)' })
  @ApiResponse({ status: 204, description: '프로젝트 삭제 성공' })
  @ApiResponse({ status: 404, description: '프로젝트를 찾을 수 없음', type: ErrorResponseDto })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    const project = await this.projectManagerService.getProject(id);
    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }
    await this.projectRepository.remove(project);
  }
}
