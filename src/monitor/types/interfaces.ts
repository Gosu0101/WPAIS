import { RiskLevel, HealthStatus, TrendDirection } from './enums';

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

export interface EpisodeBufferDetail {
  episodeNumber: number;
  isSealed: boolean;
  isCompleted: boolean;
  isSealTarget: boolean;
  isReserveTarget: boolean;
}

export interface EpisodeRisk {
  episodeId: string;
  episodeNumber: number;
  riskLevel: RiskLevel;
  daysRemaining: number;
  estimatedDaysToComplete: number;
  deadline: Date;
  progress: number;
}

export interface ProjectRisk {
  projectId: string;
  overallRiskLevel: RiskLevel;
  atRiskEpisodes: EpisodeRisk[];
  riskScore: number;
}

export interface ProjectProgress {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
  episodeProgress: EpisodeProgress[];
  stageProgress: StageProgress[];
}

export interface EpisodeProgress {
  episodeId: string;
  episodeNumber: number;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
}

export interface StageProgress {
  stage: string;
  totalTasks: number;
  completedTasks: number;
  progressPercentage: number;
}

export interface VelocityData {
  actualVelocity: number;
  requiredVelocity: number;
  velocityDeficit: number;
  isDeficient: boolean;
}

export interface VelocityTrend {
  period: '7d' | '14d' | '30d';
  direction: TrendDirection;
  velocityChange: number;
  averageVelocity: number;
}

export interface SealCountdown {
  daysRemaining: number;
  sealDate: Date;
  predictedCompletionDate: Date;
  achievementProbability: number;
  isOnTrack: boolean;
}

export interface HealthCheckResult {
  projectId: string;
  healthScore: number;
  status: HealthStatus;
  factors: HealthFactor[];
  recommendations: string[];
}

export interface HealthFactor {
  name: string;
  score: number;
  weight: number;
  status: HealthStatus;
}

export interface SnapshotMetrics {
  progress: number;
  bufferStatus: BufferStatus;
  riskLevel: RiskLevel;
  velocity: number;
}

export interface TrendAnalysis {
  period: 'weekly' | 'monthly';
  progressChange: number;
  velocityChange: number;
  riskTrend: TrendDirection;
}

export interface DashboardData {
  projectId: string;
  progress: ProjectProgress;
  bufferStatus: BufferStatus;
  risk: ProjectRisk;
  velocity: VelocityData;
  sealCountdown: SealCountdown;
  health: HealthCheckResult;
}
