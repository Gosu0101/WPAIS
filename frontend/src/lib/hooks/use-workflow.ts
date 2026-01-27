"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export function usePage(id: string) {
  return useQuery({
    queryKey: ["page", id],
    queryFn: () => apiClient.pages.get(id),
    enabled: !!id,
  });
}

export function useStartTask(pageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskType: string) => apiClient.pages.startTask(pageId, taskType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page", pageId] });
    },
  });
}

export function useCompleteTask(pageId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (taskType: string) => apiClient.pages.completeTask(pageId, taskType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["page", pageId] });
    },
  });
}
