import { Injectable } from '@nestjs/common';
import { VelocityConfig, getDefaultVelocityConfig } from '../types';

/**
 * VelocityConfigService - 적응 가속도 로직을 관리하는 서비스
 * 
 * 회차 번호에 따라 제작 기간을 결정합니다:
 * - 적응기(Learning Period): 1~10화, 회차당 14일
 * - 정상기(Normal Period): 11화 이후, 회차당 7일
 */
@Injectable()
export class VelocityConfigService {
  private config: VelocityConfig;

  constructor(config?: VelocityConfig) {
    this.config = config ?? getDefaultVelocityConfig();
  }

  /**
   * 회차 번호에 따른 제작 기간을 반환합니다.
   * @param episodeNumber 회차 번호 (1 이상의 정수)
   * @returns 제작 기간 (일 단위)
   * @throws Error if episodeNumber is less than 1
   */
  getDuration(episodeNumber: number): number {
    if (episodeNumber < 1) {
      throw new Error(`Invalid episode number: ${episodeNumber}. Episode number must be a positive integer.`);
    }

    if (episodeNumber <= this.config.learningPeriodEnd) {
      return this.config.learningPeriodDuration;
    }
    
    return this.config.normalPeriodDuration;
  }

  /**
   * 해당 회차가 적응기(Learning Period)인지 확인합니다.
   * @param episodeNumber 회차 번호
   * @returns 적응기 여부
   */
  isLearningPeriod(episodeNumber: number): boolean {
    if (episodeNumber < 1) {
      throw new Error(`Invalid episode number: ${episodeNumber}. Episode number must be a positive integer.`);
    }
    
    return episodeNumber <= this.config.learningPeriodEnd;
  }

  /**
   * 현재 가중치 설정을 반환합니다.
   * @returns 가중치 설정 객체
   */
  getConfig(): VelocityConfig {
    return { ...this.config };
  }
}
