import { NextRequest, NextResponse } from 'next/server';

const BACKEND_API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

function buildBackendUrl(path: string[], request: NextRequest) {
  const url = new URL(`${BACKEND_API_BASE_URL.replace(/\/$/, '')}/${path.join('/')}`);
  url.search = request.nextUrl.search;
  return url.toString();
}

function buildForwardHeaders(request: NextRequest) {
  const headers = new Headers();

  const authorization = request.headers.get('authorization');
  const contentType = request.headers.get('content-type');
  const cookie = request.headers.get('cookie');

  if (authorization) {
    headers.set('authorization', authorization);
  }

  if (contentType) {
    headers.set('content-type', contentType);
  }

  if (cookie) {
    headers.set('cookie', cookie);
  }

  return headers;
}

async function proxy(request: NextRequest, path: string[]) {
  const response = await fetch(buildBackendUrl(path, request), {
    method: request.method,
    headers: buildForwardHeaders(request),
    body:
      request.method === 'GET' || request.method === 'HEAD'
        ? undefined
        : await request.text(),
    cache: 'no-store',
  });

  const proxiedResponse = new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
  });

  const contentType = response.headers.get('content-type');
  if (contentType) {
    proxiedResponse.headers.set('content-type', contentType);
  }

  const setCookies = response.headers.getSetCookie?.() ?? [];
  for (const setCookie of setCookies) {
    proxiedResponse.headers.append('set-cookie', setCookie);
  }

  const fallbackSetCookie = response.headers.get('set-cookie');
  if (fallbackSetCookie && setCookies.length === 0) {
    proxiedResponse.headers.set('set-cookie', fallbackSetCookie);
  }

  return proxiedResponse;
}

async function resolvePath(context: { params: Promise<unknown> }) {
  const params = (await context.params) as { path?: string[] };
  return params.path ?? [];
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<unknown> },
) {
  const path = await resolvePath(context);
  return proxy(request, path);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<unknown> },
) {
  const path = await resolvePath(context);
  return proxy(request, path);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<unknown> },
) {
  const path = await resolvePath(context);
  return proxy(request, path);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<unknown> },
) {
  const path = await resolvePath(context);
  return proxy(request, path);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<unknown> },
) {
  const path = await resolvePath(context);
  return proxy(request, path);
}

export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<unknown> },
) {
  const path = await resolvePath(context);
  return proxy(request, path);
}
