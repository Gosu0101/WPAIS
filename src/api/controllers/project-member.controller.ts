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
} from '@nestjs/common';
import { RecipientResolverService } from '../../notification/services/recipient-resolver.service';
import { MemberRole } from '../../notification/types';
import { TaskType } from '../../workflow/types';

class AddMemberDto {
  userId: string;
  role: MemberRole;
  taskType?: TaskType;
}

class UpdateMemberDto {
  role?: MemberRole;
  taskType?: TaskType;
}

@Controller('projects/:projectId/members')
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
