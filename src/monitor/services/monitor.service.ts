import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Episode, Project } from '../../scheduling';
import { Page } from '../../workflow';
import { BufferStatusService } from './buffer-status.service';
import { RiskAnalyzerService } from './risk-analyzer.service';
import { ProgressService } from './progress.service';
import { VelocityAnalyzerService } from './velocity-analyzer.service';
import { AlertService } from './alert.service';
import { SealCountdownService } from './seal-countdown.service';
import { HealthCheckService } from './health-check.service';
import { HistoryService } from './history.service';
import {
  DashboardData,
  BufferStatus,
  ProjectRisk,
  ProjectProgress,
  VelocityData,
  SealCountdown,
  HealthCheckResult,
  EpisodeRisk,
  VelocityTrend,
  TrendAnalysis,
  RiskLevel,
} from '../types';
import { Alert, ProgressSnapshot } from '../entities';

@Injectable()
export class MonitorService {
  constructor(
    @InjectRepository(Episode)
    private readonly episodeRepository: Repository<Episode>,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly bufferStatusService: BufferStatusService,
    private readonly riskAnalyzerService: RiskAnalyzerService,
    private readonly progressService: ProgressService,
    private readonly velocityAnalyzerService: VelocityAnalyzerService,
    private readonly alertService: AlertService,
    private readonly sealCountdownService: SealCountdownService,
    private readonly healthCheckService: HealthCheckService,
    private readonly historyService: HistoryService,
  ) {}

  async getDashboardData(projectId: string): Promise<DashboardData> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
    });
    if (!project) {
      throw new Error(`Project ${projectId} not found`);
    }

    const episodes = await this.episodeRepository.find({
      where: { projectId },
      order: { episodeNumber: 'ASC' },
    });

    const pages = await this.pageRepository.find({
      where: { episodeId: episodes.length > 0 ? episodes[0].id : undefined },
    });

    const allPages: Page[] = [];
    for (const episode of episodes) {
      const episodePages = await this.pageRepository.find({
        where: { episodeId: episode.id },
      });
      allPages.push(...episodePages);
    }

    const bufferStatus = this.getBufferStatus(episodes);
    const progress = this.getProgress(projectId, episodes, allPages);
    const risk = await this.getRisk(projectId, episodes, allPages);
    const velocity = this.getVelocity(episodes, project.createdAt, project.launchDate);
    const sealCountdown = this.getSealCountdown(episodes, project.launchDate, project.createdAt);
    const health = this.getHealth(projectId, bufferStatus, risk, velocity, progress.progressPercentage);

    return {
      projectId,
      progress,
      bufferStatus,
      risk,
      velocity,
      sealCountdown,
      health,
    };
  }

  getBufferStatus(episodes: Episode[]): BufferStatus {
    return this.bufferStatusService.getBufferStatus(episodes);
  }

  getProgress(
    projectId: string,
    episodes: Episode[],
    pages: Page[],
  ): ProjectProgress {
    return this.progressService.getProgress(projectId, episodes, pages);
  }

  async getRisk(
    projectId: string,
    episodes: Episode[],
    pages: Page[],
  ): Promise<ProjectRisk> {
    const episodeRisks: EpisodeRisk[] = [];

    for (const episode of episodes) {
      const episodePages = pages.filter((p) => p.episodeId === episode.id);
      const risk = this.riskAnalyzerService.analyzeEpisodeRisk(
        episode,
        episodePages,
      );
      episodeRisks.push(risk);
    }

    const projectRisk = this.riskAnalyzerService.getProjectRiskLevel(episodeRisks);
    projectRisk.projectId = projectId;

    return projectRisk;
  }

  getVelocity(
    episodes: Episode[],
    startDate: Date,
    sealDate: Date,
  ): VelocityData {
    return this.velocityAnalyzerService.getVelocityData(
      episodes,
      startDate,
      sealDate,
    );
  }

  getSealCountdown(
    episodes: Episode[],
    sealDate: Date,
    startDate: Date,
  ): SealCountdown {
    return this.sealCountdownService.getSealCountdown(
      episodes,
      sealDate,
      startDate,
    );
  }

  getHealth(
    projectId: string,
    bufferStatus: BufferStatus,
    risk: ProjectRisk,
    velocity: VelocityData,
    progressPercentage: number,
  ): HealthCheckResult {
    return this.healthCheckService.getHealthCheck(
      projectId,
      bufferStatus,
      risk,
      velocity,
      progressPercentage,
    );
  }

  async getVelocityTrend(
    projectId: string,
    period: '7d' | '14d' | '30d',
  ): Promise<VelocityTrend> {
    const snapshots = await this.historyService.getSnapshots(projectId);
    return this.velocityAnalyzerService.getVelocityTrend(snapshots, period);
  }

  async getAlertHistory(
    projectId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<{ alerts: Alert[]; total: number }> {
    return this.alertService.getAlertHistory(projectId, options);
  }

  async getTrend(
    projectId: string,
    period: 'weekly' | 'monthly',
  ): Promise<TrendAnalysis> {
    return this.historyService.getTrend(projectId, period);
  }

  async saveSnapshot(projectId: string): Promise<ProgressSnapshot> {
    const dashboard = await this.getDashboardData(projectId);

    const metrics = {
      progress: dashboard.progress.progressPercentage,
      bufferStatus: dashboard.bufferStatus,
      riskLevel: dashboard.risk.overallRiskLevel,
      velocity: dashboard.velocity.actualVelocity,
    };

    return this.historyService.saveSnapshot(
      projectId,
      metrics,
      dashboard.health.healthScore,
    );
  }
}
