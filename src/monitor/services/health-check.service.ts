import { Injectable } from '@nestjs/common';
import {
  HealthCheckResult,
  HealthFactor,
  HealthStatus,
  BufferStatus,
  ProjectRisk,
  VelocityData,
  RiskLevel,
} from '../types';

@Injectable()
export class HealthCheckService {
  private readonly WEIGHTS = {
    buffer: 0.3,
    risk: 0.3,
    velocity: 0.25,
    progress: 0.15,
  };

  getHealthCheck(
    projectId: string,
    bufferStatus: BufferStatus,
    risk: ProjectRisk,
    velocity: VelocityData,
    progressPercentage: number,
  ): HealthCheckResult {
    const factors = this.calculateFactors(
      bufferStatus,
      risk,
      velocity,
      progressPercentage,
    );

    const healthScore = this.calculateHealthScore(factors);
    const status = this.determineHealthStatus(healthScore);
    const recommendations = this.generateRecommendations(factors, status);

    return {
      projectId,
      healthScore,
      status,
      factors,
      recommendations,
    };
  }

  generateRecommendations(
    factors: HealthFactor[],
    status: HealthStatus,
  ): string[] {
    const recommendations: string[] = [];

    for (const factor of factors) {
      if (factor.status === HealthStatus.CRITICAL) {
        recommendations.push(
          this.getCriticalRecommendation(factor.name),
        );
      } else if (factor.status === HealthStatus.WARNING) {
        recommendations.push(
          this.getWarningRecommendation(factor.name),
        );
      }
    }

    if (status === HealthStatus.CRITICAL && recommendations.length === 0) {
      recommendations.push('긴급 점검이 필요합니다. 프로젝트 상태를 즉시 확인하세요.');
    }

    return recommendations;
  }

  private calculateFactors(
    bufferStatus: BufferStatus,
    risk: ProjectRisk,
    velocity: VelocityData,
    progressPercentage: number,
  ): HealthFactor[] {
    return [
      this.calculateBufferFactor(bufferStatus),
      this.calculateRiskFactor(risk),
      this.calculateVelocityFactor(velocity),
      this.calculateProgressFactor(progressPercentage),
    ];
  }

  private calculateBufferFactor(bufferStatus: BufferStatus): HealthFactor {
    const avgProgress =
      (bufferStatus.sealProgress + bufferStatus.reserveProgress) / 2;
    const score = Math.min(100, avgProgress);
    const status = this.getStatusFromScore(score);

    return {
      name: 'buffer',
      score,
      weight: this.WEIGHTS.buffer,
      status,
    };
  }

  private calculateRiskFactor(risk: ProjectRisk): HealthFactor {
    const riskScoreMap: Record<RiskLevel, number> = {
      [RiskLevel.LOW]: 100,
      [RiskLevel.MEDIUM]: 70,
      [RiskLevel.HIGH]: 40,
      [RiskLevel.CRITICAL]: 10,
    };

    const score = riskScoreMap[risk.overallRiskLevel];
    const status = this.getStatusFromScore(score);

    return {
      name: 'risk',
      score,
      weight: this.WEIGHTS.risk,
      status,
    };
  }

  private calculateVelocityFactor(velocity: VelocityData): HealthFactor {
    let score: number;

    if (!velocity.isDeficient) {
      score = 100;
    } else {
      const deficitRatio =
        velocity.requiredVelocity > 0
          ? velocity.velocityDeficit / velocity.requiredVelocity
          : 1;
      score = Math.max(0, 100 - deficitRatio * 100);
    }

    const status = this.getStatusFromScore(score);

    return {
      name: 'velocity',
      score,
      weight: this.WEIGHTS.velocity,
      status,
    };
  }

  private calculateProgressFactor(progressPercentage: number): HealthFactor {
    const score = Math.min(100, progressPercentage);
    const status = this.getStatusFromScore(score);

    return {
      name: 'progress',
      score,
      weight: this.WEIGHTS.progress,
      status,
    };
  }

  private calculateHealthScore(factors: HealthFactor[]): number {
    const weightedSum = factors.reduce(
      (sum, factor) => sum + factor.score * factor.weight,
      0,
    );
    return Math.round(weightedSum);
  }

  private determineHealthStatus(score: number): HealthStatus {
    if (score >= 80) return HealthStatus.HEALTHY;
    if (score >= 60) return HealthStatus.ATTENTION;
    if (score >= 40) return HealthStatus.WARNING;
    return HealthStatus.CRITICAL;
  }

  private getStatusFromScore(score: number): HealthStatus {
    if (score >= 80) return HealthStatus.HEALTHY;
    if (score >= 60) return HealthStatus.ATTENTION;
    if (score >= 40) return HealthStatus.WARNING;
    return HealthStatus.CRITICAL;
  }

  private getCriticalRecommendation(factorName: string): string {
    const recommendations: Record<string, string> = {
      buffer: '비축 에피소드가 심각하게 부족합니다. 즉시 제작 속도를 높이세요.',
      risk: '프로젝트 리스크가 매우 높습니다. 위험 에피소드를 우선 처리하세요.',
      velocity: '제작 속도가 심각하게 부족합니다. 추가 리소스 투입을 검토하세요.',
      progress: '전체 진행률이 매우 낮습니다. 병목 구간을 확인하세요.',
    };
    return recommendations[factorName] || '긴급 점검이 필요합니다.';
  }

  private getWarningRecommendation(factorName: string): string {
    const recommendations: Record<string, string> = {
      buffer: '비축 에피소드가 부족합니다. 제작 일정을 점검하세요.',
      risk: '일부 에피소드에 리스크가 있습니다. 모니터링을 강화하세요.',
      velocity: '제작 속도가 목표에 미달합니다. 일정 조정을 검토하세요.',
      progress: '진행률이 예상보다 낮습니다. 작업 효율을 점검하세요.',
    };
    return recommendations[factorName] || '주의가 필요합니다.';
  }
}
