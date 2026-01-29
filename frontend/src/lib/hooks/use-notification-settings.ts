'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { useAuth } from '../contexts/auth-context';

export interface NotificationSetting {
  id: string;
  projectId: string;
  userId: string;
  enabledTypes: string[];
  thresholds: {
    task: number[];
    episode: number[];
    milestone: number[];
  };
  updatedAt: string;
}

export function useNotificationSettings(projectId: string, userId: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery<{ data: NotificationSetting }>({
    queryKey: ['notification-settings', projectId, userId],
    queryFn: () =>
      apiClient.get(`/projects/${projectId}/notification-settings?userId=${userId}`),
    enabled: !!projectId && !!userId && isAuthenticated && !authLoading,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      projectId,
      userId,
      updates,
    }: {
      projectId: string;
      userId: string;
      updates: {
        enabledTypes?: string[];
        thresholds?: Partial<NotificationSetting['thresholds']>;
      };
    }) =>
      apiClient.patch(
        `/projects/${projectId}/notification-settings?userId=${userId}`,
        updates
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['notification-settings', variables.projectId, variables.userId],
      });
    },
  });
}
