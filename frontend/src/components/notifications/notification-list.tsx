'use client';

import { useState } from 'react';
import { Bell, CheckCheck, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationItem } from './notification-item';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/lib/hooks/use-notifications';

interface NotificationListProps {
  recipientId: string;
  projectId?: string;
}

export function NotificationList({ recipientId, projectId }: NotificationListProps) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useNotifications(recipientId, {
    projectId,
    isRead: filter === 'unread' ? false : undefined,
    page,
    limit: 20,
  });

  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate({ recipientId, projectId });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }
  const notifications = data?.data || [];
  const total = data?.total || 0;
  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="h-5 w-5" />
          알림
        </h2>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
            <SelectTrigger className="w-[120px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="unread">미확인</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            disabled={markAllAsRead.isPending || unreadCount === 0}
          >
            <CheckCheck className="h-4 w-4 mr-1" />
            모두 확인
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-500">
            <Bell className="h-12 w-12 mb-4 opacity-50" />
            <p>알림이 없습니다</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              isPending={markAsRead.isPending && markAsRead.variables === notification.id}
            />
          ))
        )}
      </ScrollArea>

      {total > 20 && (
        <div className="flex items-center justify-center gap-2 p-4 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="text-sm text-gray-500">
            {page} / {Math.ceil(total / 20)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}
