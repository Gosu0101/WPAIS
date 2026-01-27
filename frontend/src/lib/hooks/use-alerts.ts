"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export function useAlerts(
  projectId: string,
  params?: { severity?: string; limit?: number }
) {
  return useQuery({
    queryKey: ["alerts", projectId, params],
    queryFn: () => apiClient.monitor.alerts(projectId, params),
    enabled: !!projectId,
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
