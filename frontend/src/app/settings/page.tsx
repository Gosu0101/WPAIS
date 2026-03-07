'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell, FolderKanban, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/contexts/auth-context';

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const storedProjectId = window.localStorage.getItem('selectedProjectId');
    setSelectedProjectId(storedProjectId);
  }, []);

  const handleLogout = () => {
    startTransition(async () => {
      await logout();
      window.localStorage.removeItem('selectedProjectId');
      router.replace('/login');
    });
  };

  return (
    <AppLayout title="설정" subtitle="계정과 프로젝트 설정을 관리하세요">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              계정
            </CardTitle>
            <CardDescription>현재 로그인한 사용자 정보를 확인하고 세션을 관리합니다.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex h-24 items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : user ? (
              <>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">이름</p>
                  <p className="mt-1 font-medium">{user.name}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">이메일</p>
                  <p className="mt-1 font-medium">{user.email}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">권한</p>
                  <p className="mt-1 font-medium">{user.systemRole}</p>
                </div>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                  disabled={isPending}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  {isPending ? '로그아웃 중...' : '로그아웃'}
                </Button>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                현재 로그인 정보가 없습니다. 다시 로그인해 주세요.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                프로젝트 알림 설정
              </CardTitle>
              <CardDescription>현재 선택된 프로젝트의 알림 기준과 수신 규칙을 관리합니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedProjectId ? (
                <Link href={`/projects/${selectedProjectId}/settings/notifications`}>
                  <Button className="w-full justify-start">
                    <Bell className="mr-2 h-4 w-4" />
                    현재 프로젝트 알림 설정 열기
                  </Button>
                </Link>
              ) : (
                <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
                  선택된 프로젝트가 없습니다. 먼저 프로젝트를 선택한 뒤 알림 설정으로 이동하세요.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5" />
                프로젝트 바로가기
              </CardTitle>
              <CardDescription>자주 쓰는 관리 화면으로 빠르게 이동합니다.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Link href="/projects">
                <Button variant="outline" className="w-full justify-start">
                  <FolderKanban className="mr-2 h-4 w-4" />
                  프로젝트 목록
                </Button>
              </Link>
              <Link href="/projects/new">
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  새 프로젝트 생성
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
