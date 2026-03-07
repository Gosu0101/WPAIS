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

export function useNotificationSettings(projectId: string) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  
  return useQuery<{ data: NotificationSetting }>({
    queryKey: ['notification-settings', projectId, user?.id],
    queryFn: () =>
      apiClient.get(`/projects/${projectId}/notification-settings`),
    enabled: !!projectId && !!user?.id && isAuthenticated && !authLoading,
  });
}

export function useUpdateNotificationSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: ({
      projectId,
      updates,
    }: {
      projectId: string;
      updates: {
        enabledTypes?: string[];
        thresholds?: Partial<NotificationSetting['thresholds']>;
      };
    }) =>
      apiClient.patch(
        `/projects/${projectId}/notification-settings`,
        updates
      ),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['notification-settings', variables.projectId, user?.id],
      });
    },
  });
}
