"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, CreateProjectDto, UpdateProjectDto } from "../api/client";
import { useAuth } from "../contexts/auth-context";

export function useProjects(params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC'; title?: string }) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ["projects", params],
    queryFn: () => apiClient.projects.list(params),
    enabled: isAuthenticated && !authLoading, // 인증 완료 후에만 실행
  });
}

export function useProject(id: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ["project", id],
    queryFn: () => apiClient.projects.get(id),
    enabled: !!id && isAuthenticated && !authLoading,
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
