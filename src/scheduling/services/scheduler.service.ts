import { Injectable } from '@nestjs/common';
import { VelocityConfigService } from './velocity-config.service';

/**
 * SchedulerService - 스케줄링의 핵심 로직을 담당하는 메인 서비스
 * 
 * 런칭일을 기준으로 역산하여 전체 제작 일정을 계산합니다.
 */
@Injectable()
export class SchedulerService {
  constructor(private readonly velocityConfigService: VelocityConfigService) {}

  /**
   * 봉인일(Seal Date)을 계산합니다.
   * 봉인일은 런칭일 30일 전으로, 7화 원고가 완성되어야 하는 날짜입니다.
   * 
   * @param launchDate 런칭 목표일
   * @returns 봉인일 (런칭일 - 30일)
   */
  calculateSealDate(launchDate: Date): Date {
    const sealDate = new Date(launchDate);
    sealDate.setDate(sealDate.getDate() - 30);
    return sealDate;
  }
}
