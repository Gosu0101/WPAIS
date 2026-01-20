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

  /**
   * 전체 제작 기간을 계산합니다.
   * 적응기(1~10화)와 정상기(11화+)의 제작 기간을 합산합니다.
   * 
   * @param episodeCount 총 회차 수
   * @returns 전체 제작 기간 (일 단위)
   */
  calculateTotalProductionDuration(episodeCount: number): number {
    if (episodeCount < 1) {
      throw new Error(`Invalid episode count: ${episodeCount}. Episode count must be a positive integer.`);
    }

    let totalDuration = 0;
    for (let ep = 1; ep <= episodeCount; ep++) {
      totalDuration += this.velocityConfigService.getDuration(ep);
    }
    return totalDuration;
  }

  /**
   * 제작 시작일을 계산합니다.
   * 봉인일에서 총 제작 기간을 역산하여 계산합니다.
   * 
   * @param launchDate 런칭 목표일
   * @param episodeCount 총 회차 수
   * @returns 제작 시작일
   */
  calculateProductionStartDate(launchDate: Date, episodeCount: number): Date {
    const sealDate = this.calculateSealDate(launchDate);
    const totalDuration = this.calculateTotalProductionDuration(episodeCount);
    
    const productionStartDate = new Date(sealDate);
    productionStartDate.setDate(productionStartDate.getDate() - totalDuration);
    return productionStartDate;
  }

  /**
   * 채용 시작일을 계산합니다.
   * 제작 시작일에서 35일(5주) 전으로 계산합니다.
   * 
   * @param productionStartDate 제작 시작일
   * @returns 채용 시작일
   */
  calculateHiringStartDate(productionStartDate: Date): Date {
    const hiringStartDate = new Date(productionStartDate);
    hiringStartDate.setDate(hiringStartDate.getDate() - 35);
    return hiringStartDate;
  }

  /**
   * 기획 시작일을 계산합니다.
   * 채용 시작일에서 56일(8주) 전으로 계산합니다.
   * 
   * @param hiringStartDate 채용 시작일
   * @returns 기획 시작일
   */
  calculatePlanningStartDate(hiringStartDate: Date): Date {
    const planningStartDate = new Date(hiringStartDate);
    planningStartDate.setDate(planningStartDate.getDate() - 56);
    return planningStartDate;
  }
}
