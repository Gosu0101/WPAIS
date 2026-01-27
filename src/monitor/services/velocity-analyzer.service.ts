import { Injectable } from '@nestjs/common';
import { Episode, EpisodeStatus } from '../../scheduling';
import { VelocityData, VelocityTrend, TrendDirection } from '../types';
import { ProgressSnapshot } from '../entities';

@Injectable()
export class VelocityAnalyzerService {
  calculateActualVelocity(
    episodes: Episode[],
    startDate: Date,
    currentDate: Date = new Date(),
  ): number {
    const completedEpisodes = episodes.filter(
      (e) => e.status === EpisodeStatus.COMPLETED,
    ).length;

    const elapsedDays = this.calculateDaysBetween(startDate, currentDate);

    if (elapsedDays <= 0) return 0;
    return Number((completedEpisodes / elapsedDays).toFixed(3));
  }

  calculateRequiredVelocity(
    remainingEpisodes: number,
    daysUntilSeal: number,
  ): number {
    if (daysUntilSeal <= 0) return Infinity;
    return Number((remainingEpisodes / daysUntilSeal).toFixed(3));
  }

  getVelocityData(
    episodes: Episode[],
    startDate: Date,
    sealDate: Date,
    currentDate: Date = new Date(),
  ): VelocityData {
    const actualVelocity = this.calculateActualVelocity(
      episodes,
      startDate,
      currentDate,
    );

    const completedCount = episodes.filter(
      (e) => e.status === EpisodeStatus.COMPLETED,
    ).length;
    const remainingEpisodes = 7 - completedCount;
    const daysUntilSeal = this.calculateDaysBetween(currentDate, sealDate);

    const requiredVelocity = this.calculateRequiredVelocity(
      remainingEpisodes,
      daysUntilSeal,
    );

    const velocityDeficit = Math.max(0, requiredVelocity - actualVelocity);
    const isDeficient = velocityDeficit > 0;

    return {
      actualVelocity,
      requiredVelocity,
      velocityDeficit,
      isDeficient,
    };
  }

  getVelocityTrend(
    snapshots: ProgressSnapshot[],
    period: '7d' | '14d' | '30d',
  ): VelocityTrend {
    const days = period === '7d' ? 7 : period === '14d' ? 14 : 30;
    const recentSnapshots = this.getRecentSnapshots(snapshots, days);

    if (recentSnapshots.length < 2) {
      return {
        period,
        direction: TrendDirection.STABLE,
        velocityChange: 0,
        averageVelocity: 0,
      };
    }

    const velocities = recentSnapshots.map((s) => s.metrics.velocity);
    const averageVelocity =
      velocities.reduce((a, b) => a + b, 0) / velocities.length;

    const firstHalf = velocities.slice(0, Math.floor(velocities.length / 2));
    const secondHalf = velocities.slice(Math.floor(velocities.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const velocityChange = secondAvg - firstAvg;
    const direction = this.determineTrendDirection(velocityChange);

    return {
      period,
      direction,
      velocityChange: Number(velocityChange.toFixed(3)),
      averageVelocity: Number(averageVelocity.toFixed(3)),
    };
  }

  checkVelocityDeficit(velocityData: VelocityData): {
    isDeficient: boolean;
    deficit: number;
    message: string;
  } {
    const { actualVelocity, requiredVelocity, velocityDeficit, isDeficient } =
      velocityData;

    let message = '';
    if (isDeficient) {
      const deficitPercent = Math.round(
        (velocityDeficit / requiredVelocity) * 100,
      );
      message = `속도 부족: 현재 ${actualVelocity.toFixed(3)} ep/day, 필요 ${requiredVelocity.toFixed(3)} ep/day (${deficitPercent}% 부족)`;
    } else {
      message = '속도 정상: 목표 달성 가능';
    }

    return {
      isDeficient,
      deficit: velocityDeficit,
      message,
    };
  }

  private calculateDaysBetween(startDate: Date, endDate: Date): number {
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private getRecentSnapshots(
    snapshots: ProgressSnapshot[],
    days: number,
  ): ProgressSnapshot[] {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return snapshots
      .filter((s) => new Date(s.snapshotDate) >= cutoffDate)
      .sort(
        (a, b) =>
          new Date(a.snapshotDate).getTime() -
          new Date(b.snapshotDate).getTime(),
      );
  }

  private determineTrendDirection(change: number): TrendDirection {
    if (change > 0.01) return TrendDirection.IMPROVING;
    if (change < -0.01) return TrendDirection.DECLINING;
    return TrendDirection.STABLE;
  }
}
