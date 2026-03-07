import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { IsEnum, IsOptional, IsUUID } from 'class-validator';
import { RecipientResolverService } from '../../notification/services/recipient-resolver.service';
import { MemberRole } from '../../notification/types';
import { TaskType } from '../../workflow/types';
import {
  ProjectPermissionGuard,
  RequireProjectPermission,
  ProjectPermission,
} from '../../auth';

class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(MemberRole)
  role: MemberRole;

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;
}

class UpdateMemberDto {
  @IsOptional()
  @IsEnum(MemberRole)
  role?: MemberRole;

  @IsOptional()
  @IsEnum(TaskType)
  taskType?: TaskType;
}

@Controller('projects/:projectId/members')
@UseGuards(ProjectPermissionGuard)
@RequireProjectPermission(ProjectPermission.MANAGE_MEMBERS)
export class ProjectMemberController {
  constructor(
    private readonly recipientResolver: RecipientResolverService,
  ) {}

  /**
   * GET /api/projects/:id/members - 멤버 목록
   */
  @Get()
  async getMembers(@Param('projectId', ParseUUIDPipe) projectId: string) {
    const members = await this.recipientResolver.getProjectMembers(projectId);
    return { data: members };
  }

  /**
   * POST /api/projects/:id/members - 멤버 추가
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Body() dto: AddMemberDto,
  ) {
    const member = await this.recipientResolver.addMember(
      projectId,
      dto.userId,
      dto.role,
      dto.taskType,
    );
    return { success: true, member };
  }

  /**
   * PATCH /api/projects/:id/members/:memberId - 멤버 역할/담당 공정 수정
   */
  @Patch(':memberId')
  @HttpCode(HttpStatus.OK)
  async updateMember(
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateMemberDto,
  ) {
    const member = await this.recipientResolver.updateMember(memberId, dto);

    if (!member) {
      throw new NotFoundException('Member not found');
    }

    return { success: true, member };
  }


  /**
   * DELETE /api/projects/:id/members/:memberId - 멤버 제거
   */
  @Delete(':memberId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('projectId', ParseUUIDPipe) projectId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    await this.recipientResolver.removeMember(memberId);
    return { success: true };
  }
}
