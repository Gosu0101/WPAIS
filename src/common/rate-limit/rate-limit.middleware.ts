import type { NextFunction, Request, Response } from 'express';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  id: string;
  windowMs: number;
  maxRequests: number;
  message: string;
  keyGenerator?: (request: Request) => string;
  skip?: (request: Request) => boolean;
}

function getClientIp(request: Request) {
  return request.ip || request.socket.remoteAddress || 'unknown';
}

function removeExpiredEntries(store: Map<string, RateLimitEntry>, now: number) {
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

export function buildLoginRateLimitKey(request: Request) {
  const email =
    typeof request.body?.email === 'string'
      ? request.body.email.trim().toLowerCase()
      : 'anonymous';

  return `${getClientIp(request)}:${email}`;
}

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const store = new Map<string, RateLimitEntry>();

  return (request: Request, response: Response, next: NextFunction) => {
    if (options.skip?.(request)) {
      return next();
    }

    const now = Date.now();

    if (store.size > 5000) {
      removeExpiredEntries(store, now);
    }

    const keySuffix = options.keyGenerator?.(request) ?? getClientIp(request);
    const key = `${options.id}:${keySuffix}`;
    const currentEntry = store.get(key);

    const entry =
      !currentEntry || currentEntry.resetAt <= now
        ? {
            count: 0,
            resetAt: now + options.windowMs,
          }
        : currentEntry;

    entry.count += 1;
    store.set(key, entry);

    const retryAfterSeconds = Math.max(
      1,
      Math.ceil((entry.resetAt - now) / 1000),
    );
    const remaining = Math.max(options.maxRequests - entry.count, 0);

    response.setHeader('Retry-After', String(retryAfterSeconds));
    response.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    response.setHeader('X-RateLimit-Remaining', String(remaining));
    response.setHeader(
      'X-RateLimit-Reset',
      new Date(entry.resetAt).toISOString(),
    );

    if (entry.count > options.maxRequests) {
      return response.status(429).json({
        statusCode: 429,
        error: 'Too Many Requests',
        message: options.message,
        code: 'RATE_LIMIT_EXCEEDED',
        scope: options.id,
        retryAfterSeconds,
      });
    }

    return next();
  };
}
