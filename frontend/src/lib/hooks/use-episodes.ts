"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient, Episode, EpisodeDetail, EpisodeStatus } from "../api/client";

export function useEpisodes(projectId: string, status?: EpisodeStatus) {
  return useQuery({
    queryKey: ["episodes", projectId, status],
    queryFn: () => apiClient.episodes.list(projectId, status ? { status } : undefined),
    enabled: !!projectId,
  });
}

export function useEpisode(id: string) {
  return useQuery<EpisodeDetail>({
    queryKey: ["episode", id],
    queryFn: () => apiClient.episodes.get(id),
    enabled: !!id,
  });
}
