"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api/client";

export function useDashboard(projectId: string) {
  return useQuery({
    queryKey: ["dashboard", projectId],
    queryFn: () => apiClient.monitor.dashboard(projectId),
    enabled: !!projectId,
    refetchInterval: 60 * 1000, // 1분마다 자동 갱신
  });
}

export function useBufferStatus(projectId: string) {
  return useQuery({
    queryKey: ["buffer-status", projectId],
    queryFn: () => apiClient.monitor.bufferStatus(projectId),
    enabled: !!projectId,
  });
}

export function useRiskAnalysis(projectId: string) {
  return useQuery({
    queryKey: ["risk", projectId],
    queryFn: () => apiClient.monitor.risk(projectId),
    enabled: !!projectId,
  });
}

export function useVelocity(projectId: string) {
  return useQuery({
    queryKey: ["velocity", projectId],
    queryFn: () => apiClient.monitor.velocity(projectId),
    enabled: !!projectId,
  });
}

export function useHealth(projectId: string) {
  return useQuery({
    queryKey: ["health", projectId],
    queryFn: () => apiClient.monitor.health(projectId),
    enabled: !!projectId,
  });
}
