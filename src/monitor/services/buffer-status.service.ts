import { Injectable } from '@nestjs/common';
import { Episode, EpisodeStatus } from '../../scheduling';
import { BufferStatus, EpisodeBufferDetail } from '../types';

@Injectable()
export class BufferStatusService {
  private readonly SEAL_TARGET = 7;
  private readonly RESERVE_TARGET = 3;
  private readonly TOTAL_TARGET = 10;

  getBufferStatus(episodes: Episode[]): BufferStatus {
    const completedEpisodes = episodes.filter(
      (e) => e.status === EpisodeStatus.COMPLETED,
    );

    const sealedEpisodes = completedEpisodes.filter(
      (e) => e.episodeNumber <= this.SEAL_TARGET,
    ).length;

    const reserveEpisodes = completedEpisodes.filter(
      (e) =>
        e.episodeNumber > this.SEAL_TARGET &&
        e.episodeNumber <= this.TOTAL_TARGET,
    ).length;

    const sealProgress =
      this.SEAL_TARGET > 0
        ? Math.round((sealedEpisodes / this.SEAL_TARGET) * 100)
        : 0;

    const reserveProgress =
      this.RESERVE_TARGET > 0
        ? Math.round((reserveEpisodes / this.RESERVE_TARGET) * 100)
        : 0;

    const isOnTrack =
      sealedEpisodes >= this.SEAL_TARGET &&
      reserveEpisodes >= this.RESERVE_TARGET;

    return {
      sealedEpisodes,
      reserveEpisodes,
      totalCompleted: completedEpisodes.length,
      sealTarget: this.SEAL_TARGET,
      reserveTarget: this.RESERVE_TARGET,
      sealProgress,
      reserveProgress,
      isOnTrack,
    };
  }

  getEpisodeBufferDetails(episodes: Episode[]): EpisodeBufferDetail[] {
    return episodes.map((episode) => ({
      episodeNumber: episode.episodeNumber,
      isSealed:
        episode.episodeNumber <= this.SEAL_TARGET &&
        episode.status === EpisodeStatus.COMPLETED,
      isCompleted: episode.status === EpisodeStatus.COMPLETED,
      isSealTarget: episode.episodeNumber <= this.SEAL_TARGET,
      isReserveTarget:
        episode.episodeNumber > this.SEAL_TARGET &&
        episode.episodeNumber <= this.TOTAL_TARGET,
    }));
  }
}
