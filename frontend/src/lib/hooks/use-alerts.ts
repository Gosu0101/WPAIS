"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuth } from "../contexts/auth-context";

export function useAlerts(
  projectId: string,
  params?: { severity?: string; limit?: number }
) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ["alerts", projectId, params],
    queryFn: () => apiClient.monitor.alerts(projectId, params),
    enabled: !!projectId && isAuthenticated && !authLoading,
  });
}

export function useAcknowledgeAlert() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => apiClient.monitor.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}
