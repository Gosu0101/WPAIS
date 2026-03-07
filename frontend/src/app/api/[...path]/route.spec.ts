import { NextRequest } from 'next/server';
import { GET, POST } from './route';

describe('frontend API proxy route', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    delete process.env.NEXT_PUBLIC_API_URL;
  });

  it('forwards GET requests with query params, auth headers, and cookies', async () => {
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ authenticated: true }), {
        status: 200,
        headers: {
          'content-type': 'application/json',
          'set-cookie': 'refreshToken=rotated; Path=/; HttpOnly',
        },
      }),
    );

    const request = new NextRequest(
      'http://localhost:3000/api/auth/session?projectId=123',
      {
        headers: {
          authorization: 'Bearer access-token',
          cookie: 'refreshToken=initial',
        },
      },
    );

    const response = await GET(request, {
      params: Promise.resolve({ path: ['auth', 'session'] }),
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://localhost:3001/api/auth/session?projectId=123',
      expect.objectContaining({
        method: 'GET',
        cache: 'no-store',
      }),
    );

    const fetchOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    const forwardedHeaders = fetchOptions.headers as Headers;

    expect(forwardedHeaders.get('authorization')).toBe('Bearer access-token');
    expect(forwardedHeaders.get('cookie')).toBe('refreshToken=initial');
    expect(fetchOptions.body).toBeUndefined();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('application/json');
    expect(response.headers.get('set-cookie')).toContain('refreshToken=rotated');
    await expect(response.json()).resolves.toEqual({ authenticated: true });
  });

  it('forwards POST bodies and respects NEXT_PUBLIC_API_URL overrides', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'http://backend.internal:4000/api';

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 201,
        headers: {
          'content-type': 'application/json',
        },
      }),
    );

    const payload = JSON.stringify({
      email: 'tester@example.com',
      password: 'Password1',
    });

    const request = new NextRequest('http://localhost:3000/api/auth/login', {
      method: 'POST',
      body: payload,
      headers: {
        'content-type': 'application/json',
      },
    });

    const response = await POST(request, {
      params: Promise.resolve({ path: ['auth', 'login'] }),
    });

    expect(fetchSpy).toHaveBeenCalledWith(
      'http://backend.internal:4000/api/auth/login',
      expect.objectContaining({
        method: 'POST',
        cache: 'no-store',
        body: payload,
      }),
    );

    const fetchOptions = fetchSpy.mock.calls[0][1] as RequestInit;
    const forwardedHeaders = fetchOptions.headers as Headers;

    expect(forwardedHeaders.get('content-type')).toBe('application/json');
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
