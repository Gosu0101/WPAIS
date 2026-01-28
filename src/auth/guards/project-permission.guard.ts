import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemRole, JwtPayload } from '../types';
import { ProjectMember } from '../../notification/entities/project-member.entity';
import { MemberRole } from '../../notification/types';
import {
  PROJECT_PERMISSION_KEY,
  ProjectPermission,
} from '../decorators/project-permission.decorator';

/**
 * 프로젝트 권한 Guard
 * 프로젝트 멤버십 및 역할을 검증합니다.
 */
@Injectable()
export class ProjectPermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.getAllAndOverride<ProjectPermission>(
      PROJECT_PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    // @ProjectPermission() 데코레이터가 없으면 통과
    if (!requiredPermission) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtPayload = request.user;

    if (!user) {
      return false;
    }

    // ADMIN은 모든 프로젝트에 접근 가능
    if (user.systemRole === SystemRole.ADMIN) {
      return true;
    }

    // projectId 추출 (params 또는 body에서)
    const projectId =
      request.params.projectId ||
      request.params.id ||
      request.body?.projectId;

    if (!projectId) {
      throw new ForbiddenException('프로젝트 ID가 필요합니다.');
    }

    // 프로젝트 멤버 조회
    const member = await this.memberRepository.findOne({
      where: { projectId, userId: user.sub },
    });

    if (!member) {
      throw new ForbiddenException('프로젝트에 접근 권한이 없습니다.');
    }

    // 권한 검증
    return this.hasPermission(member, requiredPermission);
  }

  private hasPermission(
    member: ProjectMember,
    permission: ProjectPermission,
  ): boolean {
    switch (permission) {
      case ProjectPermission.VIEW:
        // 모든 멤버가 조회 가능
        return true;

      case ProjectPermission.EDIT:
        // PD만 수정 가능
        return member.role === MemberRole.PD;

      case ProjectPermission.MANAGE_MEMBERS:
        // PD만 멤버 관리 가능
        return member.role === MemberRole.PD;

      case ProjectPermission.EDIT_ASSIGNED_TASK:
        // 모든 멤버가 담당 작업 수정 가능
        return true;

      default:
        return false;
    }
  }
}
