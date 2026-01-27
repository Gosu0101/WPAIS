"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export function useMilestones(projectId: string) {
  return useQuery({
    queryKey: ["milestones", projectId],
    queryFn: () => apiClient.milestones.list(projectId),
    enabled: !!projectId,
  });
}
