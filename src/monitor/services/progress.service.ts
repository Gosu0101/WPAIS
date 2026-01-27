import { Injectable } from '@nestjs/common';
import { Episode } from '../../scheduling';
import { Page, TaskStatus, TaskType } from '../../workflow';
import { ProjectProgress, EpisodeProgress, StageProgress } from '../types';

@Injectable()
export class ProgressService {
  getProgress(
    projectId: string,
    episodes: Episode[],
    pages: Page[],
  ): ProjectProgress {
    const totalTasks = pages.length * 4;
    const completedTasks = this.countCompletedTasks(pages);
    const progressPercentage =
      totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const episodeProgress = this.getEpisodeProgress(episodes, pages);
    const stageProgress = this.getStageProgress(pages);

    return {
      projectId,
      totalTasks,
      completedTasks,
      progressPercentage,
      episodeProgress,
      stageProgress,
    };
  }

  getEpisodeProgress(episodes: Episode[], pages: Page[]): EpisodeProgress[] {
    return episodes.map((episode) => {
      const episodePages = pages.filter((p) => p.episodeId === episode.id);
      const totalTasks = episodePages.length * 4;
      const completedTasks = this.countCompletedTasks(episodePages);
      const progressPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        episodeId: episode.id,
        episodeNumber: episode.episodeNumber,
        totalTasks,
        completedTasks,
        progressPercentage,
      };
    });
  }

  getStageProgress(pages: Page[]): StageProgress[] {
    const stages = [
      { stage: TaskType.BACKGROUND, statusKey: 'backgroundStatus' as const },
      { stage: TaskType.LINE_ART, statusKey: 'lineArtStatus' as const },
      { stage: TaskType.COLORING, statusKey: 'coloringStatus' as const },
      { stage: TaskType.POST_PROCESSING, statusKey: 'postProcessingStatus' as const },
    ];

    return stages.map(({ stage, statusKey }) => {
      const totalTasks = pages.length;
      const completedTasks = pages.filter(
        (p) => p[statusKey] === TaskStatus.DONE,
      ).length;
      const progressPercentage =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      return {
        stage,
        totalTasks,
        completedTasks,
        progressPercentage,
      };
    });
  }

  private countCompletedTasks(pages: Page[]): number {
    let count = 0;
    for (const page of pages) {
      if (page.backgroundStatus === TaskStatus.DONE) count++;
      if (page.lineArtStatus === TaskStatus.DONE) count++;
      if (page.coloringStatus === TaskStatus.DONE) count++;
      if (page.postProcessingStatus === TaskStatus.DONE) count++;
    }
    return count;
  }
}
