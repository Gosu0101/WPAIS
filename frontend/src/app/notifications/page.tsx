'use client';

import { Bell } from 'lucide-react';
import { AppLayout } from '@/components/layout';
import { NotificationList } from '@/components/notifications';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/contexts/auth-context';

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();

  return (
    <AppLayout title="알림" subtitle="모든 프로젝트의 사용자 알림을 확인합니다">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            전체 알림
          </CardTitle>
          <CardDescription>
            프로젝트별 알림과 시스템 알림을 한 곳에서 확인하고 읽음 처리할 수 있습니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[480px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : user ? (
            <div className="h-[560px] overflow-hidden rounded-lg border border-border">
              <NotificationList recipientId={user.id} />
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-border p-6 text-sm text-muted-foreground">
              로그인한 사용자 정보를 확인할 수 없습니다.
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
