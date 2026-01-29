"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, Milestone } from "../api/client";
import { useAuth } from "../contexts/auth-context";

export function useMilestones(projectId: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery<Milestone[]>({
    queryKey: ["milestones", projectId],
    queryFn: () => apiClient.milestones.list(projectId),
    enabled: !!projectId && isAuthenticated && !authLoading,
  });
}
