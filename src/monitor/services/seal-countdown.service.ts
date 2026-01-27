import { Injectable } from '@nestjs/common';
import { Episode, EpisodeStatus } from '../../scheduling';
import { SealCountdown } from '../types';

@Injectable()
export class SealCountdownService {
  private readonly SEAL_TARGET = 7;

  getSealCountdown(
    episodes: Episode[],
    sealDate: Date,
    startDate: Date,
    currentDate: Date = new Date(),
  ): SealCountdown {
    const daysRemaining = this.calculateDaysRemaining(currentDate, sealDate);
    const completedCount = episodes.filter(
      (e) =>
        e.episodeNumber <= this.SEAL_TARGET &&
        e.status === EpisodeStatus.COMPLETED,
    ).length;

    const remainingEpisodes = this.SEAL_TARGET - completedCount;
    const elapsedDays = this.calculateDaysRemaining(startDate, currentDate);
    const velocity =
      elapsedDays > 0 ? completedCount / elapsedDays : 0;

    const predictedCompletionDate = this.predictCompletionDate(
      remainingEpisodes,
      velocity,
      currentDate,
    );

    const achievementProbability = this.calculateAchievementProbability(
      daysRemaining,
      remainingEpisodes,
      velocity,
    );

    const isOnTrack = predictedCompletionDate <= sealDate;

    return {
      daysRemaining,
      sealDate,
      predictedCompletionDate,
      achievementProbability,
      isOnTrack,
    };
  }

  predictCompletionDate(
    remainingEpisodes: number,
    velocity: number,
    currentDate: Date = new Date(),
  ): Date {
    if (remainingEpisodes <= 0) {
      return currentDate;
    }

    if (velocity <= 0) {
      const farFuture = new Date(currentDate);
      farFuture.setFullYear(farFuture.getFullYear() + 1);
      return farFuture;
    }

    const daysNeeded = Math.ceil(remainingEpisodes / velocity);
    const completionDate = new Date(currentDate);
    completionDate.setDate(completionDate.getDate() + daysNeeded);

    return completionDate;
  }

  private calculateDaysRemaining(startDate: Date, endDate: Date): number {
    const diffTime = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateAchievementProbability(
    daysRemaining: number,
    remainingEpisodes: number,
    velocity: number,
  ): number {
    if (remainingEpisodes <= 0) return 100;
    if (daysRemaining <= 0) return 0;
    if (velocity <= 0) return 0;

    const requiredVelocity = remainingEpisodes / daysRemaining;
    const velocityRatio = velocity / requiredVelocity;

    if (velocityRatio >= 1.5) return 95;
    if (velocityRatio >= 1.2) return 85;
    if (velocityRatio >= 1.0) return 70;
    if (velocityRatio >= 0.8) return 50;
    if (velocityRatio >= 0.6) return 30;
    if (velocityRatio >= 0.4) return 15;
    return 5;
  }
}
