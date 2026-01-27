import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { ProgressSnapshot } from '../entities';
import { SnapshotMetrics, TrendAnalysis, TrendDirection, BufferStatus, RiskLevel } from '../types';

@Injectable()
export class HistoryService {
  constructor(
    @InjectRepository(ProgressSnapshot)
    private readonly snapshotRepository: Repository<ProgressSnapshot>,
  ) {}

  async saveSnapshot(
    projectId: string,
    metrics: SnapshotMetrics,
    healthScore: number,
    snapshotDate: Date = new Date(),
  ): Promise<ProgressSnapshot> {
    const existingSnapshot = await this.snapshotRepository.findOne({
      where: {
        projectId,
        snapshotDate: snapshotDate,
      },
    });

    if (existingSnapshot) {
      existingSnapshot.metrics = metrics;
      existingSnapshot.healthScore = healthScore;
      return this.snapshotRepository.save(existingSnapshot);
    }

    const snapshot = this.snapshotRepository.create({
      projectId,
      snapshotDate,
      metrics,
      healthScore,
    });

    return this.snapshotRepository.save(snapshot);
  }

  async getSnapshots(
    projectId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    },
  ): Promise<ProgressSnapshot[]> {
    const where: Record<string, unknown> = { projectId };

    if (options?.startDate && options?.endDate) {
      where.snapshotDate = Between(options.startDate, options.endDate);
    } else if (options?.startDate) {
      where.snapshotDate = MoreThanOrEqual(options.startDate);
    } else if (options?.endDate) {
      where.snapshotDate = LessThanOrEqual(options.endDate);
    }

    return this.snapshotRepository.find({
      where,
      order: { snapshotDate: 'DESC' },
      take: options?.limit,
    });
  }

  async getTrend(
    projectId: string,
    period: 'weekly' | 'monthly',
  ): Promise<TrendAnalysis> {
    const days = period === 'weekly' ? 7 : 30;
    const currentDate = new Date();
    const startDate = new Date(currentDate);
    startDate.setDate(startDate.getDate() - days);

    const previousStartDate = new Date(startDate);
    previousStartDate.setDate(previousStartDate.getDate() - days);

    const currentSnapshots = await this.getSnapshots(projectId, {
      startDate,
      endDate: currentDate,
    });

    const previousSnapshots = await this.getSnapshots(projectId, {
      startDate: previousStartDate,
      endDate: startDate,
    });

    const currentAvgProgress = this.calculateAverageProgress(currentSnapshots);
    const previousAvgProgress = this.calculateAverageProgress(previousSnapshots);
    const progressChange = currentAvgProgress - previousAvgProgress;

    const currentAvgVelocity = this.calculateAverageVelocity(currentSnapshots);
    const previousAvgVelocity = this.calculateAverageVelocity(previousSnapshots);
    const velocityChange = currentAvgVelocity - previousAvgVelocity;

    const riskTrend = this.determineRiskTrend(currentSnapshots, previousSnapshots);

    return {
      period,
      progressChange: Number(progressChange.toFixed(2)),
      velocityChange: Number(velocityChange.toFixed(3)),
      riskTrend,
    };
  }

  private calculateAverageProgress(snapshots: ProgressSnapshot[]): number {
    if (snapshots.length === 0) return 0;
    const sum = snapshots.reduce((acc, s) => acc + s.metrics.progress, 0);
    return sum / snapshots.length;
  }

  private calculateAverageVelocity(snapshots: ProgressSnapshot[]): number {
    if (snapshots.length === 0) return 0;
    const sum = snapshots.reduce((acc, s) => acc + s.metrics.velocity, 0);
    return sum / snapshots.length;
  }

  private determineRiskTrend(
    currentSnapshots: ProgressSnapshot[],
    previousSnapshots: ProgressSnapshot[],
  ): TrendDirection {
    const riskLevelToNumber = (level: RiskLevel): number => {
      switch (level) {
        case RiskLevel.LOW:
          return 0;
        case RiskLevel.MEDIUM:
          return 1;
        case RiskLevel.HIGH:
          return 2;
        case RiskLevel.CRITICAL:
          return 3;
        default:
          return 0;
      }
    };

    const currentAvgRisk =
      currentSnapshots.length > 0
        ? currentSnapshots.reduce(
            (acc, s) => acc + riskLevelToNumber(s.metrics.riskLevel),
            0,
          ) / currentSnapshots.length
        : 0;

    const previousAvgRisk =
      previousSnapshots.length > 0
        ? previousSnapshots.reduce(
            (acc, s) => acc + riskLevelToNumber(s.metrics.riskLevel),
            0,
          ) / previousSnapshots.length
        : 0;

    const riskChange = currentAvgRisk - previousAvgRisk;

    if (riskChange < -0.5) return TrendDirection.IMPROVING;
    if (riskChange > 0.5) return TrendDirection.DECLINING;
    return TrendDirection.STABLE;
  }
}
