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

export const apiClient = {
  projects: {
    list: () => fetchApi<unknown[]>("/projects"),
    get: (id: string) => fetchApi<unknown>(`/projects/${id}`),
    create: (data: CreateProjectDto) =>
      fetchApi<unknown>("/projects", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (id: string, data: UpdateProjectDto) =>
      fetchApi<unknown>(`/projects/${id}`, {
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
      fetchApi<unknown>(`/projects/${projectId}/dashboard`),
    bufferStatus: (projectId: string) =>
      fetchApi<unknown>(`/projects/${projectId}/buffer-status`),
    risk: (projectId: string) =>
      fetchApi<unknown>(`/projects/${projectId}/risk`),
    velocity: (projectId: string) =>
      fetchApi<unknown>(`/projects/${projectId}/velocity`),
    health: (projectId: string) =>
      fetchApi<unknown>(`/projects/${projectId}/health`),
    alerts: (projectId: string, params?: { severity?: string; limit?: number }) => {
      const searchParams = new URLSearchParams();
      if (params?.severity) searchParams.set("severity", params.severity);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      const query = searchParams.toString();
      return fetchApi<unknown[]>(
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
