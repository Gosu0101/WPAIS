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
export interface VelocityConfig {
  backgroundWeight: number;
  lineArtWeight: number;
  coloringWeight: number;
  postProcessingWeight: number;
}

export interface CreateProjectDto {
  title: string;
  launchDate: string;
  episodeCount?: number;
  velocityConfig?: VelocityConfig;
}

export interface UpdateProjectDto {
  title?: string;
  launchDate?: string;
}

export interface Project {
  id: string;
  title: string;
  launchDate: string;
  sealDate: string;
  productionStartDate: string;
  hiringStartDate: string;
  planningStartDate: string;
  velocityConfig: VelocityConfig;
  createdAt: string;
  updatedAt: string;
}

export interface Alert {
  id: string;
  projectId: string;
  severity: "INFO" | "WARNING" | "CRITICAL" | "ERROR";
  alertType: string;
  type: string; // alias for alertType
  message: string;
  acknowledged: boolean;
  acknowledgedAt?: string | null;
  createdAt: string;
}

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type HealthStatus = "HEALTHY" | "ATTENTION" | "WARNING" | "CRITICAL";

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

export interface EpisodeProgress {
  episodeId: string;
  episodeNumber: number;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
}

export type TaskType = "BACKGROUND" | "LINE_ART" | "COLORING" | "POST_PROCESSING";

export interface StageProgress {
  stage: TaskType;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
}

export interface ProjectProgress {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  episodeProgress: EpisodeProgress[];
  stageProgress: StageProgress[];
}

export interface RiskEpisode {
  episodeNumber: number;
  riskLevel: RiskLevel;
  reason: string;
}

export interface ProjectRisk {
  projectId: string;
  overallRiskLevel: RiskLevel;
  riskScore: number;
  atRiskEpisodes?: RiskEpisode[];
}

export interface VelocityData {
  actualVelocity: number;
  requiredVelocity: number;
  velocityDeficit: number;
  isDeficient: boolean;
}

export interface SealCountdown {
  daysRemaining: number;
  sealDate: string;
  predictedCompletionDate: string;
  achievementProbability: number;
  isOnTrack: boolean;
}

export interface HealthFactor {
  name: string;
  score: number;
  status: HealthStatus;
}

export interface HealthData {
  projectId: string;
  healthScore: number;
  status: HealthStatus;
  factors: HealthFactor[];
  recommendations: string[];
}

export interface DashboardData {
  projectId: string;
  progress: ProjectProgress;
  bufferStatus: BufferStatus;
  risk: ProjectRisk;
  velocity: VelocityData;
  sealCountdown: SealCountdown;
  health: HealthData;
}

export interface AlertsResponse {
  alerts: Alert[];
  total: number;
}

export type EpisodeStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED";
export type TaskStatus = "LOCKED" | "READY" | "IN_PROGRESS" | "DONE";

export interface Episode {
  id: string;
  projectId: string;
  episodeNumber: number;
  dueDate: string;
  duration: number;
  status: EpisodeStatus;
  isSealed: boolean;
}

export interface Page {
  id: string;
  pageNumber: number;
  heightPx: number;
  backgroundStatus: TaskStatus;
  lineArtStatus: TaskStatus;
  coloringStatus: TaskStatus;
  postProcessingStatus: TaskStatus;
}

export interface EpisodeDetail extends Episode {
  pages?: Page[];
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export type MilestoneType =
  | "PLANNING_COMPLETE"
  | "HIRING_COMPLETE"
  | "PRODUCTION_START"
  | "EPISODE_3_COMPLETE"
  | "EPISODE_5_COMPLETE"
  | "EPISODE_7_SEAL"
  | "LAUNCH";

export interface Milestone {
  id: string;
  name: string;
  type: MilestoneType;
  targetDate: string;
  isCompleted: boolean;
  completedAt?: string | null;
}

export const apiClient = {
  projects: {
    list: (params?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'ASC' | 'DESC'; title?: string }) => {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set("page", params.page.toString());
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      if (params?.sortBy) searchParams.set("sortBy", params.sortBy);
      if (params?.sortOrder) searchParams.set("sortOrder", params.sortOrder);
      if (params?.title) searchParams.set("title", params.title);
      const query = searchParams.toString();
      return fetchApi<PaginatedResponse<Project>>(`/projects${query ? `?${query}` : ""}`);
    },
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
    list: (projectId: string, params?: { status?: EpisodeStatus }) => {
      const searchParams = new URLSearchParams();
      if (params?.status) searchParams.set("status", params.status);
      const query = searchParams.toString();
      return fetchApi<Episode[]>(`/projects/${projectId}/episodes${query ? `?${query}` : ""}`);
    },
    get: (id: string) => fetchApi<EpisodeDetail>(`/episodes/${id}`),
  },

  pages: {
    get: (id: string) => fetchApi<Page>(`/pages/${id}`),
    startTask: (pageId: string, taskType: string) =>
      fetchApi<Page>(`/pages/${pageId}/tasks/${taskType}/start`, {
        method: "POST",
      }),
    completeTask: (pageId: string, taskType: string) =>
      fetchApi<Page>(`/pages/${pageId}/tasks/${taskType}/complete`, {
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
    alerts: async (projectId: string, params?: { severity?: string; limit?: number }): Promise<AlertsResponse> => {
      const searchParams = new URLSearchParams();
      if (params?.severity) searchParams.set("severity", params.severity);
      if (params?.limit) searchParams.set("limit", params.limit.toString());
      const query = searchParams.toString();
      const response = await fetchApi<{ data: Array<{
        id: string;
        projectId: string;
        alertType: string;
        severity: string;
        message: string;
        acknowledgedAt?: string | null;
        createdAt: string;
      }>; meta: { total: number } }>(
        `/projects/${projectId}/alerts${query ? `?${query}` : ""}`
      );
      
      // Transform backend response to frontend format
      const alerts: Alert[] = response.data.map(alert => ({
        ...alert,
        type: alert.alertType,
        acknowledged: !!alert.acknowledgedAt,
        severity: alert.severity as Alert['severity'],
      }));
      
      return {
        alerts,
        total: response.meta.total,
      };
    },
    acknowledgeAlert: (alertId: string) =>
      fetchApi<unknown>(`/alerts/${alertId}/acknowledge`, {
        method: "POST",
      }),
  },

  milestones: {
    list: (projectId: string) =>
      fetchApi<Milestone[]>(`/projects/${projectId}/milestones`),
  },

  calendar: {
    getEvents: (params: {
      startDate: string;
      endDate: string;
      projectIds?: string[];
      types?: ('episode' | 'milestone' | 'task')[];
    }) => {
      const searchParams = new URLSearchParams();
      searchParams.set('startDate', params.startDate);
      searchParams.set('endDate', params.endDate);
      if (params.projectIds?.length) {
        params.projectIds.forEach(id => searchParams.append('projectIds', id));
      }
      if (params.types?.length) {
        params.types.forEach(type => searchParams.append('types', type));
      }
      return fetchApi<CalendarEventsResponse>(`/calendar/events?${searchParams.toString()}`);
    },
    getProjectEvents: (projectId: string, params: {
      startDate: string;
      endDate: string;
      types?: ('episode' | 'milestone' | 'task')[];
    }) => {
      const searchParams = new URLSearchParams();
      searchParams.set('startDate', params.startDate);
      searchParams.set('endDate', params.endDate);
      if (params.types?.length) {
        params.types.forEach(type => searchParams.append('types', type));
      }
      return fetchApi<CalendarEventsResponse>(`/projects/${projectId}/calendar/events?${searchParams.toString()}`);
    },
    rescheduleEvent: (eventId: string, data: { newDate: string; eventType: 'episode' | 'milestone' | 'task' }) =>
      fetchApi<RescheduleEventResponse>(`/calendar/events/${eventId}/reschedule`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
};

// Calendar Types
export type CalendarEventType = 'episode' | 'milestone' | 'task';

export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  type: CalendarEventType;
  projectId: string;
  projectTitle?: string;
  color?: string;
  extendedProps: Record<string, unknown>;
}

export interface CalendarProject {
  id: string;
  title: string;
  color: string;
}

export interface CalendarEventsResponse {
  events: CalendarEvent[];
  projects: CalendarProject[];
}

export interface RescheduleEventResponse {
  success: boolean;
  affectedEvents?: CalendarEvent[];
  warnings?: string[];
}


export default apiClient;
