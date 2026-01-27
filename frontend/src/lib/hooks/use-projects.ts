"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, CreateProjectDto, UpdateProjectDto } from "../api/client";

export function useProjects(params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC'; title?: string }) {
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => apiClient.projects.list(params),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => apiClient.projects.get(id),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateProjectDto) => apiClient.projects.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useUpdateProject(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProjectDto) => apiClient.projects.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project", id] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.projects.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
