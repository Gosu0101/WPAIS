'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { apiClient } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

function getSafeRedirectTarget(redirect: string | null) {
  if (!redirect || !redirect.startsWith('/')) {
    return '/';
  }

  if (redirect.startsWith('//')) {
    return '/';
  }

  return redirect;
}

async function waitForSessionReady(retries = 5, delayMs = 150) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      await apiClient.auth.session();
      return;
    } catch {
      if (attempt === retries - 1) {
        throw new Error('세션이 아직 준비되지 않았습니다.');
      }

      await new Promise((resolve) => {
        window.setTimeout(resolve, delayMs);
      });
    }
  }
}

type LoginStep = 'idle' | 'authenticating' | 'verifying-session' | 'redirecting';

function getStepLabel(step: LoginStep) {
  switch (step) {
    case 'authenticating':
      return '자격 증명을 확인하는 중입니다.';
    case 'verifying-session':
      return '세션 쿠키를 확인하는 중입니다.';
    case 'redirecting':
      return '다음 화면으로 이동하는 중입니다.';
    default:
      return null;
  }
}

function getFriendlyError(error: string | null) {
  if (!error) {
    return null;
  }

  if (error.includes('세션이 아직 준비되지 않았습니다')) {
    return {
      title: '세션 연결이 지연되고 있습니다.',
      description:
        '로그인은 성공했지만 세션 확인이 늦어지고 있습니다. 잠시 후 다시 시도하고, 백엔드가 `npm run start:watch` 또는 `npm run start:dev`로 실행 중인지 확인하세요.',
    };
  }

  return {
    title: '로그인에 실패했습니다.',
    description: error,
  };
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<LoginStep>('idle');
  const redirectTo = getSafeRedirectTarget(searchParams.get('redirect'));
  const errorDetails = useMemo(() => getFriendlyError(error), [error]);
  const stepLabel = getStepLabel(step);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    setStep('authenticating');

    try {
      await login(email, password);
      setStep('verifying-session');
      await waitForSessionReady();
      setStep('redirecting');
      window.location.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
      setStep('idle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">WPAIS</CardTitle>
          <CardDescription className="text-center">
            웹툰 제작 AI 지원 시스템에 로그인하세요
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {redirectTo !== '/' && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
                로그인 후 <span className="font-medium">{redirectTo}</span>로 이동합니다.
              </div>
            )}
            {errorDetails && (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <p className="font-medium">{errorDetails.title}</p>
                <p className="mt-1 whitespace-pre-line">{errorDetails.description}</p>
              </div>
            )}
            {isLoading && stepLabel && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {stepLabel}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? '처리 중...' : '로그인'}
            </Button>
            <p className="text-sm text-center text-gray-600">
              계정이 없으신가요?{' '}
              <Link
                href={
                  searchParams.get('redirect')
                    ? `/register?redirect=${encodeURIComponent(searchParams.get('redirect')!)}`
                    : '/register'
                }
                className="text-blue-600 hover:underline"
              >
                회원가입
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
