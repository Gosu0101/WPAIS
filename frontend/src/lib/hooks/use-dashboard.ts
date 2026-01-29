"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";
import { useAuth } from "../contexts/auth-context";

export function useDashboard(projectId: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: () => apiClient.monitor.dashboard(projectId),
    enabled: !!projectId && isAuthenticated && !authLoading,
    refetchInterval: 60 * 1000, // 1분마다 자동 갱신
  });
}

export function useBufferStatus(projectId: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ["buffer-status", projectId],
    queryFn: () => apiClient.monitor.bufferStatus(projectId),
    enabled: !!projectId && isAuthenticated && !authLoading,
  });
}

export function useRiskAnalysis(projectId: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ["risk", projectId],
    queryFn: () => apiClient.monitor.risk(projectId),
    enabled: !!projectId && isAuthenticated && !authLoading,
  });
}

export function useVelocity(projectId: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ["velocity", projectId],
    queryFn: () => apiClient.monitor.velocity(projectId),
    enabled: !!projectId && isAuthenticated && !authLoading,
  });
}

export function useHealth(projectId: string) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  
  return useQuery({
    queryKey: ["health", projectId],
    queryFn: () => apiClient.monitor.health(projectId),
    enabled: !!projectId && isAuthenticated && !authLoading,
  });
}
