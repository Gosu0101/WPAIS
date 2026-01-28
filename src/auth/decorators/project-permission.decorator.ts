import { SetMetadata } from '@nestjs/common';

export const PROJECT_PERMISSION_KEY = 'projectPermission';

/**
 * 프로젝트 권한 유형
 */
export enum ProjectPermission {
  /** 프로젝트 조회 */
  VIEW = 'VIEW',
  /** 프로젝트 수정 (PD만) */
  EDIT = 'EDIT',
  /** 멤버 관리 (PD만) */
  MANAGE_MEMBERS = 'MANAGE_MEMBERS',
  /** 담당 작업 수정 */
  EDIT_ASSIGNED_TASK = 'EDIT_ASSIGNED_TASK',
}

/**
 * 프로젝트 권한 요구 데코레이터
 * 지정된 권한을 가진 프로젝트 멤버만 접근을 허용합니다.
 * 
 * @example
 * @ProjectPermission(ProjectPermission.EDIT)
 * @Put(':projectId')
 * updateProject() { ... }
 */
export const RequireProjectPermission = (permission: ProjectPermission) =>
  SetMetadata(PROJECT_PERMISSION_KEY, permission);
