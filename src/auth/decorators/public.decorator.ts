import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * 공개 API 데코레이터
 * 이 데코레이터가 적용된 엔드포인트는 인증 없이 접근 가능합니다.
 * 
 * @example
 * @Public()
 * @Get('health')
 * healthCheck() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
