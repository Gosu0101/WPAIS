'use client';

import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Bell, CheckCircle, AlertTriangle, AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Notification } from '@/lib/hooks/use-notifications';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  isPending?: boolean;
}

const severityConfig = {
  INFO: { icon: Bell, color: 'text-blue-500', bg: 'bg-blue-50' },
  WARNING: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  ERROR: { icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-50' },
  CRITICAL: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-50' },
};

export function NotificationItem({
  notification,
  onMarkAsRead,
  isPending = false,
}: NotificationItemProps) {
  const config = severityConfig[notification.severity];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 border-b cursor-pointer hover:bg-gray-50 transition-colors',
        isPending && 'opacity-60',
        !notification.isRead && 'bg-blue-50/30'
      )}
      onClick={() => !notification.isRead && onMarkAsRead?.(notification.id)}
    >
      <div className={cn('p-2 rounded-full', config.bg)}>
        <Icon className={cn('h-4 w-4', config.color)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn('text-sm font-medium', !notification.isRead && 'font-semibold')}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="h-2 w-2 rounded-full bg-blue-500" />
          )}
        </div>
        <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
        <p className="text-xs text-gray-400 mt-2">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
            locale: ko,
          })}
        </p>
        {isPending ? (
          <p className="text-xs text-muted-foreground mt-2">읽음 처리 중...</p>
        ) : null}
      </div>
    </div>
  );
}
