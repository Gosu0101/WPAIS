"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, EpisodeDetail, EpisodeStatus } from "../api/client";
import { useAuth } from "../contexts/auth-context";

export function useEpisodes(projectId: string, status?: EpisodeStatus) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ["episodes", projectId, status],
    queryFn: () => apiClient.episodes.list(projectId, status ? { status } : undefined),
    enabled: !!projectId && isAuthenticated && !authLoading,
  });
}

export function useEpisode(id: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery<EpisodeDetail>({
    queryKey: ["episode", id],
    queryFn: () => apiClient.episodes.get(id),
    enabled: !!id && isAuthenticated && !authLoading,
  });
}
