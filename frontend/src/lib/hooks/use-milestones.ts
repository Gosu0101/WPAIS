"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, Milestone } from "../api/client";

export function useMilestones(projectId: string) {
  return useQuery<Milestone[]>({
    queryKey: ["milestones", projectId],
    queryFn: () => apiClient.milestones.list(projectId),
    enabled: !!projectId,
  });
}
