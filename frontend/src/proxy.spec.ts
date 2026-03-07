import { NextRequest } from 'next/server';
import { proxy } from './proxy';

describe('frontend auth proxy', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('bypasses public routes without session validation', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch');

    const response = await proxy(new NextRequest('http://localhost:3000/login'));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('redirects anonymous users to login with a redirect target', async () => {
    const response = await proxy(
      new NextRequest('http://localhost:3000/projects/123?tab=overview'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirect=%2Fprojects%2F123%3Ftab%3Doverview',
    );
  });

  it('validates refresh-token sessions before allowing protected routes', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    const response = await proxy(
      new NextRequest('http://localhost:3000/projects/abc', {
        headers: {
          cookie: 'refreshToken=valid-token',
        },
      }),
    );

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3000/api/auth/session',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
        headers: {
          Cookie: 'refreshToken=valid-token',
        },
      }),
    );
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it('clears the refresh cookie when session validation fails', async () => {
    jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ message: 'Unauthorized' }), {
        status: 401,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    const response = await proxy(
      new NextRequest('http://localhost:3000/settings', {
        headers: {
          cookie: 'refreshToken=stale-token',
        },
      }),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/login?redirect=%2Fsettings',
    );
    expect(response.headers.get('set-cookie')).toContain('refreshToken=');
  });
});
