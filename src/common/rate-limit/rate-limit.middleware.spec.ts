import type { NextFunction, Request, Response } from 'express';
import {
  buildLoginRateLimitKey,
  createRateLimitMiddleware,
} from './rate-limit.middleware';

function createMockResponse() {
  const headers = new Map<string, string>();

  const response = {
    setHeader: jest.fn((name: string, value: string) => {
      headers.set(name, value);
    }),
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;

  return {
    response,
    headers,
  };
}

function createRequest(overrides?: Partial<Request>) {
  return {
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    body: {},
    path: '/projects',
    ...overrides,
  } as Request;
}

describe('rate limit middleware', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows requests within the configured limit and sets rate-limit headers', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000);

    const middleware = createRateLimitMiddleware({
      id: 'api',
      windowMs: 60_000,
      maxRequests: 2,
      message: 'Too many requests',
    });

    const request = createRequest();
    const { response, headers } = createMockResponse();
    const next = jest.fn() as NextFunction;

    middleware(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(headers.get('X-RateLimit-Limit')).toBe('2');
    expect(headers.get('X-RateLimit-Remaining')).toBe('1');
    expect(headers.get('Retry-After')).toBe('60');
  });

  it('returns 429 when the limit is exceeded', () => {
    jest.spyOn(Date, 'now').mockReturnValue(1_000);

    const middleware = createRateLimitMiddleware({
      id: 'auth-login',
      windowMs: 60_000,
      maxRequests: 1,
      message: '로그인 시도가 너무 많습니다.',
    });

    const request = createRequest({ path: '/auth/login' });
    const next = jest.fn() as NextFunction;

    middleware(request, createMockResponse().response, next);

    const secondResponse = createMockResponse();
    middleware(request, secondResponse.response, next);

    expect(secondResponse.response.status).toHaveBeenCalledWith(429);
    expect(secondResponse.response.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'RATE_LIMIT_EXCEEDED',
        scope: 'auth-login',
      }),
    );
  });

  it('supports skipped routes without consuming the limit', () => {
    const middleware = createRateLimitMiddleware({
      id: 'api',
      windowMs: 60_000,
      maxRequests: 1,
      message: 'Too many requests',
      skip: (request) => request.path === '/health',
    });

    const request = createRequest({ path: '/health' });
    const { response } = createMockResponse();
    const next = jest.fn() as NextFunction;

    middleware(request, response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(response.setHeader).not.toHaveBeenCalled();
  });

  it('uses a normalized email in the login rate-limit key', () => {
    const key = buildLoginRateLimitKey(
      createRequest({
        body: {
          email: '  USER@Example.com ',
        },
      }),
    );

    expect(key).toBe('127.0.0.1:user@example.com');
  });
});
