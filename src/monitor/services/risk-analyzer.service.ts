import { Injectable } from '@nestjs/common';
import { Episode, EpisodeStatus } from '../../scheduling';
import { Page, TaskStatus } from '../../workflow';
import { RiskLevel, EpisodeRisk, ProjectRisk } from '../types';

@Injectable()
export class RiskAnalyzerService {
  analyzeEpisodeRisk(
    episode: Episode,
    pages: Page[],
    currentDate: Date = new Date(),
  ): EpisodeRisk {
    const deadline = episode.dueDate;
    const daysRemaining = this.calculateDaysRemaining(currentDate, deadline);
    const progress = this.calculateProgress(pages);
    const estimatedDaysToComplete = this.estimateDaysToComplete(
      progress,
      pages.length,
    );
    const riskLevel = this.assignRiskLevel(
      daysRemaining,
      estimatedDaysToComplete,
      progress,
    );

    return {
      episodeId: episode.id,
      episodeNumber: episode.episodeNumber,
      riskLevel,
      daysRemaining,
      estimatedDaysToComplete,
      deadline,
      progress,
    };
  }

  getProjectRiskLevel(episodeRisks: EpisodeRisk[]): ProjectRisk {
    const atRiskEpisodes = episodeRisks.filter(
      (e) => e.riskLevel === RiskLevel.HIGH || e.riskLevel === RiskLevel.CRITICAL,
    );

    const riskScore = this.calculateRiskScore(episodeRisks);
    const overallRiskLevel = this.determineOverallRiskLevel(riskScore, atRiskEpisodes);

    return {
      projectId: '',
      overallRiskLevel,
      atRiskEpisodes,
      riskScore,
    };
  }

  private calculateDaysRemaining(currentDate: Date, deadline: Date): number {
    const diffTime = deadline.getTime() - currentDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateProgress(pages: Page[]): number {
    if (pages.length === 0) return 0;

    const totalTasks = pages.length * 4;
    let completedTasks = 0;

    for (const page of pages) {
      if (page.backgroundStatus === TaskStatus.DONE) completedTasks++;
      if (page.lineArtStatus === TaskStatus.DONE) completedTasks++;
      if (page.coloringStatus === TaskStatus.DONE) completedTasks++;
      if (page.postProcessingStatus === TaskStatus.DONE) completedTasks++;
    }

    return Math.round((completedTasks / totalTasks) * 100);
  }

  private estimateDaysToComplete(progress: number, pageCount: number): number {
    if (progress >= 100) return 0;
    if (progress === 0) return pageCount * 2;

    const remainingProgress = 100 - progress;
    const daysPerPercent = 0.2;
    return Math.ceil(remainingProgress * daysPerPercent);
  }

  private assignRiskLevel(
    daysRemaining: number,
    estimatedDays: number,
    progress: number,
  ): RiskLevel {
    if (progress >= 100) return RiskLevel.LOW;

    const buffer = daysRemaining - estimatedDays;

    if (buffer < 0 || daysRemaining < 0) return RiskLevel.CRITICAL;
    if (buffer < 3) return RiskLevel.HIGH;
    if (buffer < 7) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private calculateRiskScore(episodeRisks: EpisodeRisk[]): number {
    if (episodeRisks.length === 0) return 0;

    const riskWeights: Record<RiskLevel, number> = {
      [RiskLevel.LOW]: 0,
      [RiskLevel.MEDIUM]: 25,
      [RiskLevel.HIGH]: 50,
      [RiskLevel.CRITICAL]: 100,
    };

    const totalScore = episodeRisks.reduce(
      (sum, e) => sum + riskWeights[e.riskLevel],
      0,
    );

    return Math.round(totalScore / episodeRisks.length);
  }

  private determineOverallRiskLevel(
    riskScore: number,
    atRiskEpisodes: EpisodeRisk[],
  ): RiskLevel {
    if (atRiskEpisodes.some((e) => e.riskLevel === RiskLevel.CRITICAL)) {
      return RiskLevel.CRITICAL;
    }
    if (riskScore >= 50) return RiskLevel.HIGH;
    if (riskScore >= 25) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }
}
