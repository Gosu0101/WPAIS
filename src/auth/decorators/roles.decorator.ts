import { SetMetadata } from '@nestjs/common';
import { SystemRole } from '../types';

export const ROLES_KEY = 'roles';

/**
 * 시스템 역할 요구 데코레이터
 * 지정된 역할을 가진 사용자만 접근을 허용합니다.
 * 
 * @example
 * @Roles(SystemRole.ADMIN)
 * @Get('admin-only')
 * adminOnly() { ... }
 */
export const Roles = (...roles: SystemRole[]) => SetMetadata(ROLES_KEY, roles);
