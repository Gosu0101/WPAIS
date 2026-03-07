'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { NotificationList } from './notification-list';
import { useUnreadCount } from '@/lib/hooks/use-notifications';

interface NotificationBellProps {
  recipientId: string;
  projectId?: string;
}

export function NotificationBell({ recipientId, projectId }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { data: unreadData } = useUnreadCount(recipientId, projectId);

  const unreadCount = unreadData?.total || 0;
  const hasCritical = (unreadData?.bySeverity?.CRITICAL || 0) > 0;
  const hasError = (unreadData?.bySeverity?.ERROR || 0) > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className={cn(
            'h-5 w-5',
            hasCritical && 'text-red-500',
            !hasCritical && hasError && 'text-orange-500'
          )} />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                'absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-xs',
                hasCritical && 'bg-red-500',
                !hasCritical && hasError && 'bg-orange-500',
                !hasCritical && !hasError && 'bg-blue-500'
              )}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="end">
        <div className="h-[460px]">
          <NotificationList recipientId={recipientId} projectId={projectId} />
        </div>
        <div className="border-t border-border p-3">
          <Link href="/notifications" onClick={() => setOpen(false)}>
            <Button variant="outline" className="w-full">
              전체 알림 보기
            </Button>
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
