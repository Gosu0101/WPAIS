const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// Types
export interface CreateProjectDto {
  name: string;
  launchDate: string;
  totalEpisodes: number;
  pagesPerEpisode?: number;
}

export interface UpdateProjectDto {
  name?: string;
  launchDate?: string;
  totalEpisodes?: number;
}

export interface Project {
  id: string;
  name: string;
  launchDate: string;
  totalEpisodes: number;
  pagesPerEpisode: number;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  projectId: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  type: string;
  message: string;
  acknowledged: boolean;
  createdAt: string;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type HealthStatus = "HEALTHY" | "WARNING" | "CRITICAL";

export interface BufferStatus {
  sealedEpisodes: number;
  reserveEpisodes: number;
  totalCompleted: number;
  sealTarget: number;
  reserveTarget: number;
  sealProgress: number;
  reserveProgress: number;
  isOnTrack: boolean;
}

export interface ProjectProgress {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
}

export interface ProjectRisk {
  projectId: string;
  overallRiskLevel: RiskLevel;
  riskScore: number;
}

export interface DashboardData {
  projectId: string;
  progress: ProjectProgress;
  bufferStatus: BufferStatus;
  risk: ProjectRisk;
}

export interface AlertsResponse {
  alerts: Alert[];
  total: number;
}

export const apiClient = {
  projects: {
    list: () => fetchApi<Project[]>("/projects"),
    get: (id: string) => fetchApi<Project>(`/projects/${id}`),
    create: (data: CreateProjectDto) =>
      fetchApi<Project>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateProjectDto) =>
      fetchApi<Project>(`/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      fetchApi<void>(`/projects/${id}`, {
        method: "DELETE",
      }),
  },

  episodes: {
    list: (projectId: string) =>
      fetchApi<unknown[]>(`/projects/${projectId}/episodes`),
    get: (id: string) => fetchApi<unknown>(`/episodes/${id}`),
  },

  pages: {
    get: (id: string) => fetchApi<unknown>(`/pages/${id}`),
    startTask: (pageId: string, taskType: string) =>
      fetchApi<unknown>(`/pages/${pageId}/tasks/${taskType}/start`, {
        method: "POST",
      }),
    completeTask: (pageId: string, taskType: string) =>
      fetchApi<unknown>(`/pages/${pageId}/tasks/${taskType}/complete`, {
        method: "POST",
      }),
  },

  monitor: {
    dashboard: (projectId: string) =>
      fetchApi<DashboardData>(`/projects/${projectId}/dashboard`),
    bufferStatus: (projectId: string) =>
      fetchApi<BufferStatus>(`/projects/${projectId}/buffer-status`),
    risk: (projectId: string) =>
      fetchApi<ProjectRisk>(`/projects/${projectId}/risk`),
    velocity: (projectId: string) =>
      fetchApi<unknown>(`/projects/${projectId}/velocity`),
    health: (projectId: string) =>
      fetchApi<unknown>(`/projects/${projectId}/health`),
    alerts: (projectId: string, params?: { severity?: string; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.severity) searchParams.set("severity", params.severity);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      const query = searchParams.toString();
      return fetchApi<AlertsResponse>(
        `/projects/${projectId}/alerts${query ? `?${query}` : ""}`
      );
    },
    acknowledgeAlert: (alertId: string) =>
      fetchApi<unknown>(`/alerts/${alertId}/acknowledge`, {
        method: "POST",
      }),
  },

  milestones: {
    list: (projectId: string) =>
      fetchApi<unknown[]>(`/projects/${projectId}/milestones`),
  },
};

export default apiClient;
