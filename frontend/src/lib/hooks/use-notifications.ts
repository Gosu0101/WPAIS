'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/auth-context';

export interface Notification {
  id: string;
  projectId: string;
  recipientId: string;
  notificationType: string;
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface NotificationsResponse {
  data: Notification[];
  total: number;
  page: number;
  limit: number;
}

interface UnreadCountResponse {
  total: number;
  bySeverity: Record<string, number>;
}

export function useNotifications(
  recipientId: string,
  options?: {
    projectId?: string;
    notificationType?: string;
    isRead?: boolean;
    page?: number;
    limit?: number;
  }
) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const params = new URLSearchParams({ recipientId });
  if (options?.projectId) params.append('projectId', options.projectId);
  if (options?.notificationType) params.append('notificationType', options.notificationType);
  if (options?.isRead !== undefined) params.append('isRead', String(options.isRead));
  if (options?.page) params.append('page', String(options.page));
  if (options?.limit) params.append('limit', String(options.limit));

  return useQuery<NotificationsResponse>({
    queryKey: ['notifications', recipientId, options],
    queryFn: () => apiClient.get(`/notifications?${params.toString()}`),
    enabled: !!recipientId && isAuthenticated && !authLoading,
  });
}


export function useUnreadCount(recipientId: string, projectId?: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  const params = new URLSearchParams({ recipientId });
  if (projectId) params.append('projectId', projectId);

  return useQuery<UnreadCountResponse>({
    queryKey: ['notifications', 'unread-count', recipientId, projectId],
    queryFn: () => apiClient.get(`/notifications/unread-count?${params.toString()}`),
    enabled: !!recipientId && isAuthenticated && !authLoading,
    refetchInterval: 30000, // 30초마다 갱신
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.post(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ recipientId, projectId }: { recipientId: string; projectId?: string }) => {
      const params = new URLSearchParams({ recipientId });
      if (projectId) params.append('projectId', projectId);
      return apiClient.post(`/notifications/read-all?${params.toString()}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
