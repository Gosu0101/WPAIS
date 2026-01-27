import { ApiProperty } from '@nestjs/swagger';
import {
  DashboardData,
  BufferStatus,
  ProjectRisk,
  ProjectProgress,
  VelocityData,
  SealCountdown,
  HealthCheckResult,
  RiskLevel,
  HealthStatus,
} from '../../../monitor';

export class BufferStatusResponseDto implements BufferStatus {
  @ApiProperty({ description: '봉인된 에피소드 수' })
  sealedEpisodes: number;

  @ApiProperty({ description: '비축 에피소드 수' })
  reserveEpisodes: number;

  @ApiProperty({ description: '총 완료 에피소드 수' })
  totalCompleted: number;

  @ApiProperty({ description: '봉인 목표 (7화)' })
  sealTarget: number;

  @ApiProperty({ description: '비축 목표 (3화)' })
  reserveTarget: number;

  @ApiProperty({ description: '봉인 진행률 (%)' })
  sealProgress: number;

  @ApiProperty({ description: '비축 진행률 (%)' })
  reserveProgress: number;

  @ApiProperty({ description: '목표 달성 여부' })
  isOnTrack: boolean;
}

export class VelocityResponseDto implements VelocityData {
  @ApiProperty({ description: '실제 속도 (ep/day)' })
  actualVelocity: number;

  @ApiProperty({ description: '필요 속도 (ep/day)' })
  requiredVelocity: number;

  @ApiProperty({ description: '속도 부족분' })
  velocityDeficit: number;

  @ApiProperty({ description: '속도 부족 여부' })
  isDeficient: boolean;
}

export class SealCountdownResponseDto implements SealCountdown {
  @ApiProperty({ description: '봉인일까지 남은 일수' })
  daysRemaining: number;

  @ApiProperty({ description: '봉인일' })
  sealDate: Date;

  @ApiProperty({ description: '예측 완료일' })
  predictedCompletionDate: Date;

  @ApiProperty({ description: '달성 확률 (%)' })
  achievementProbability: number;

  @ApiProperty({ description: '목표 달성 가능 여부' })
  isOnTrack: boolean;
}

export class RiskResponseDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId: string;

  @ApiProperty({ enum: RiskLevel, description: '전체 리스크 레벨' })
  overallRiskLevel: RiskLevel;

  @ApiProperty({ description: '위험 에피소드 목록' })
  atRiskEpisodes: unknown[];

  @ApiProperty({ description: '리스크 점수' })
  riskScore: number;
}

export class HealthResponseDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId: string;

  @ApiProperty({ description: '건강 점수 (0-100)' })
  healthScore: number;

  @ApiProperty({ enum: HealthStatus, description: '건강 상태' })
  status: HealthStatus;

  @ApiProperty({ description: '건강 요소 목록' })
  factors: unknown[];

  @ApiProperty({ description: '권장 조치 목록' })
  recommendations: string[];
}

export class ProgressResponseDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId: string;

  @ApiProperty({ description: '총 작업 수' })
  totalTasks: number;

  @ApiProperty({ description: '완료된 작업 수' })
  completedTasks: number;

  @ApiProperty({ description: '진행률 (%)' })
  progressPercentage: number;

  @ApiProperty({ description: '에피소드별 진행률' })
  episodeProgress: unknown[];

  @ApiProperty({ description: '공정별 진행률' })
  stageProgress: unknown[];
}

export class DashboardResponseDto {
  @ApiProperty({ description: '프로젝트 ID' })
  projectId: string;

  @ApiProperty({ type: ProgressResponseDto, description: '진행률 정보' })
  progress: ProgressResponseDto;

  @ApiProperty({ type: BufferStatusResponseDto, description: '버퍼 상태' })
  bufferStatus: BufferStatusResponseDto;

  @ApiProperty({ type: RiskResponseDto, description: '리스크 정보' })
  risk: RiskResponseDto;

  @ApiProperty({ type: VelocityResponseDto, description: '속도 정보' })
  velocity: VelocityResponseDto;

  @ApiProperty({ type: SealCountdownResponseDto, description: '봉인 카운트다운' })
  sealCountdown: SealCountdownResponseDto;

  @ApiProperty({ type: HealthResponseDto, description: '건강 정보' })
  health: HealthResponseDto;

  static fromData(data: DashboardData): DashboardResponseDto {
    return data as DashboardResponseDto;
  }
}
