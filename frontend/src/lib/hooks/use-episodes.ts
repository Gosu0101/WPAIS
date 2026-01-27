"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export function useEpisodes(projectId: string) {
  return useQuery({
    queryKey: ["episodes", projectId],
    queryFn: () => apiClient.episodes.list(projectId),
    enabled: !!projectId,
  });
}

export function useEpisode(id: string) {
  return useQuery({
    queryKey: ["episode", id],
    queryFn: () => apiClient.episodes.get(id),
    enabled: !!id,
  });
}
