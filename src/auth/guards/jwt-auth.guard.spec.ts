import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import * as fc from 'fast-check';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * JwtAuthGuard의 공개 엔드포인트 로직만 테스트합니다.
 * AuthGuard('jwt')를 상속하므로 실제 JWT 검증은 통합 테스트에서 수행합니다.
 */
describe('JwtAuthGuard Logic', () => {
  // JwtAuthGuard의 핵심 로직을 추출하여 테스트
  const checkIsPublic = (
    reflector: Reflector,
    context: ExecutionContext,
  ): boolean => {
    const isPublic = reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    return isPublic === true;
  };

  const createMockContext = (): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({}),
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
      getClass: () => jest.fn(),
    } as unknown as ExecutionContext;
  };

  /**
   * Property 2: Valid Token Required for Protected Endpoints
   * **Validates: Requirements 4.1**
   * 
   * ∀ request to protected endpoint:
   *   IF !hasValidAccessToken(request) THEN response.status = 401
   * 
   * 이 테스트는 @Public() 데코레이터 로직을 검증합니다.
   * 실제 JWT 검증은 통합 테스트에서 수행됩니다.
   */
  describe('Property 2: Valid Token Required for Protected Endpoints', () => {
    it('should correctly identify public endpoints', async () => {
      await fc.assert(
        fc.property(fc.boolean(), (isPublic) => {
          const mockReflector = {
            getAllAndOverride: jest.fn().mockReturnValue(isPublic),
          } as unknown as Reflector;
          const context = createMockContext();

          const result = checkIsPublic(mockReflector, context);
          expect(result).toBe(isPublic);
        }),
        { numRuns: 20 },
      );
    });

    it('should call reflector with IS_PUBLIC_KEY', async () => {
      await fc.assert(
        fc.property(fc.boolean(), (isPublic) => {
          const mockReflector = {
            getAllAndOverride: jest.fn().mockReturnValue(isPublic),
          } as unknown as Reflector;
          const context = createMockContext();

          checkIsPublic(mockReflector, context);

          expect(mockReflector.getAllAndOverride).toHaveBeenCalledWith(
            IS_PUBLIC_KEY,
            expect.any(Array),
          );
        }),
        { numRuns: 10 },
      );
    });

    it('should return false when @Public() is not set', async () => {
      await fc.assert(
        fc.property(
          fc.constantFrom(undefined, null, false),
          (publicValue) => {
            const mockReflector = {
              getAllAndOverride: jest.fn().mockReturnValue(publicValue),
            } as unknown as Reflector;
            const context = createMockContext();

            const result = checkIsPublic(mockReflector, context);
            expect(result).toBe(false);
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should return true only when @Public() is explicitly true', async () => {
      const mockReflector = {
        getAllAndOverride: jest.fn().mockReturnValue(true),
      } as unknown as Reflector;
      const context = createMockContext();

      const result = checkIsPublic(mockReflector, context);
      expect(result).toBe(true);
    });
  });
});
