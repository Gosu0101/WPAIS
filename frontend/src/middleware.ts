import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 인증이 필요하지 않은 공개 경로
const publicPaths = ['/login', '/register'];

// 정적 파일 및 API 경로 제외
const excludedPaths = ['/_next', '/api', '/favicon.ico'];

function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
}

function buildLoginRedirect(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  const redirectTarget = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  loginUrl.searchParams.set('redirect', redirectTarget);
  return loginUrl;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 정적 파일 및 API 경로는 건너뛰기
  if (excludedPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // 공개 경로는 건너뛰기
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // refreshToken 쿠키 확인 (HttpOnly 쿠키는 서버에서 확인 가능)
  const refreshToken = request.cookies.get('refreshToken');

  // 토큰이 없으면 로그인 페이지로 리다이렉트
  if (!refreshToken) {
    return NextResponse.redirect(buildLoginRedirect(request));
  }

  try {
    const response = await fetch(`${getApiBaseUrl()}/auth/session`, {
      method: 'GET',
      headers: {
        Cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const redirectResponse = NextResponse.redirect(buildLoginRedirect(request));
      redirectResponse.cookies.delete('refreshToken');
      return redirectResponse;
    }
  } catch {
    const redirectResponse = NextResponse.redirect(buildLoginRedirect(request));
    redirectResponse.cookies.delete('refreshToken');
    return redirectResponse;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};
