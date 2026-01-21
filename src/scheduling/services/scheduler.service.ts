import { Injectable } from '@nestjs/common';
import { VelocityConfigService } from './velocity-config.service';
import { EpisodeSchedule, MasterSchedule, MilestoneSchedule } from '../types';
import { MilestoneType } from '../entities';

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

  /**
   * 회차별 스케줄을 생성합니다.
   * 제작 시작일부터 각 회차의 시작일, 마감일, 기간을 계산합니다.
   * 
   * - 적응기(1~10화): 14일 간격
   * - 정상기(11화+): 7일 간격
   * 
   * @param productionStartDate 제작 시작일
   * @param episodeCount 총 회차 수
   * @returns 회차별 스케줄 배열
   */
  generateEpisodeSchedules(productionStartDate: Date, episodeCount: number): EpisodeSchedule[] {
    if (episodeCount < 1) {
      throw new Error(`Invalid episode count: ${episodeCount}. Episode count must be a positive integer.`);
    }

    const schedules: EpisodeSchedule[] = [];
    let currentStartDate = new Date(productionStartDate);

    for (let episodeNumber = 1; episodeNumber <= episodeCount; episodeNumber++) {
      const duration = this.velocityConfigService.getDuration(episodeNumber);
      const isLearningPeriod = this.velocityConfigService.isLearningPeriod(episodeNumber);
      
      const dueDate = new Date(currentStartDate);
      dueDate.setDate(dueDate.getDate() + duration);

      schedules.push({
        episodeNumber,
        startDate: new Date(currentStartDate),
        dueDate,
        duration,
        isLearningPeriod,
      });

      // 다음 회차의 시작일은 현재 회차의 마감일
      currentStartDate = new Date(dueDate);
    }

    return schedules;
  }

  /**
   * 마일스톤을 생성합니다.
   * 기획 완료, 채용 완료, 제작 시작, 3화/5화/7화 완성 마일스톤을 생성합니다.
   * 
   * @param launchDate 런칭 목표일
   * @param episodeCount 총 회차 수 (기본값: 10)
   * @returns 마일스톤 스케줄 배열
   */
  generateMilestones(launchDate: Date, episodeCount: number = 10): MilestoneSchedule[] {
    if (episodeCount < 1) {
      throw new Error(`Invalid episode count: ${episodeCount}. Episode count must be a positive integer.`);
    }

    const sealDate = this.calculateSealDate(launchDate);
    const productionStartDate = this.calculateProductionStartDate(launchDate, episodeCount);
    const hiringStartDate = this.calculateHiringStartDate(productionStartDate);
    const planningStartDate = this.calculatePlanningStartDate(hiringStartDate);
    
    // 회차별 스케줄 생성 (마일스톤 날짜 계산용)
    const episodeSchedules = this.generateEpisodeSchedules(productionStartDate, episodeCount);

    const milestones: MilestoneSchedule[] = [];

    // 기획 완료 마일스톤 (기획 시작일 + 56일 = 채용 시작일)
    milestones.push({
      name: '기획 완료',
      type: MilestoneType.PLANNING_COMPLETE,
      targetDate: new Date(hiringStartDate),
    });

    // 채용 완료 마일스톤 (채용 시작일 + 35일 = 제작 시작일)
    milestones.push({
      name: '채용 완료',
      type: MilestoneType.HIRING_COMPLETE,
      targetDate: new Date(productionStartDate),
    });

    // 제작 시작 마일스톤
    milestones.push({
      name: '제작 시작',
      type: MilestoneType.PRODUCTION_START,
      targetDate: new Date(productionStartDate),
    });

    // 3화 완성 마일스톤 (episodeCount >= 3인 경우)
    if (episodeCount >= 3) {
      milestones.push({
        name: '3화 완성',
        type: MilestoneType.EPISODE_3_COMPLETE,
        targetDate: new Date(episodeSchedules[2].dueDate),
      });
    }

    // 5화 완성 마일스톤 (episodeCount >= 5인 경우)
    if (episodeCount >= 5) {
      milestones.push({
        name: '5화 완성',
        type: MilestoneType.EPISODE_5_COMPLETE,
        targetDate: new Date(episodeSchedules[4].dueDate),
      });
    }

    // 7화 봉인 마일스톤 (episodeCount >= 7인 경우)
    if (episodeCount >= 7) {
      milestones.push({
        name: '7화 봉인',
        type: MilestoneType.EPISODE_7_SEAL,
        targetDate: new Date(sealDate),
      });
    }

    // 런칭 마일스톤
    milestones.push({
      name: '런칭',
      type: MilestoneType.LAUNCH,
      targetDate: new Date(launchDate),
    });

    return milestones;
  }

  /**
   * 런칭일을 기준으로 전체 마스터 스케줄을 계산합니다.
   * 
   * 모든 계산 로직을 통합하여 MasterSchedule 객체를 반환합니다:
   * - 봉인일 (런칭일 - 30일)
   * - 제작 시작일 (봉인일 - 총 제작 기간)
   * - 채용 시작일 (제작 시작일 - 35일)
   * - 기획 시작일 (채용 시작일 - 56일)
   * - 회차별 스케줄
   * - 마일스톤 목록
   * 
   * @param launchDate 런칭 목표일
   * @param episodeCount 런칭 시 확보할 회차 수 (기본값: 10)
   * @returns 계산된 마스터 스케줄
   */
  calculateMasterSchedule(launchDate: Date, episodeCount: number = 10): MasterSchedule {
    if (episodeCount < 1) {
      throw new Error(`Invalid episode count: ${episodeCount}. Episode count must be a positive integer.`);
    }

    // 1. 봉인일 계산 (런칭일 - 30일)
    const sealDate = this.calculateSealDate(launchDate);

    // 2. 전체 제작 기간 계산
    const totalProductionDays = this.calculateTotalProductionDuration(episodeCount);

    // 3. 제작 시작일 계산 (봉인일 - 총 제작 기간)
    const productionStartDate = this.calculateProductionStartDate(launchDate, episodeCount);

    // 4. 채용 시작일 계산 (제작 시작일 - 35일)
    const hiringStartDate = this.calculateHiringStartDate(productionStartDate);

    // 5. 기획 시작일 계산 (채용 시작일 - 56일)
    const planningStartDate = this.calculatePlanningStartDate(hiringStartDate);

    // 6. 회차별 스케줄 생성
    const episodes = this.generateEpisodeSchedules(productionStartDate, episodeCount);

    // 7. 마일스톤 생성
    const milestones = this.generateMilestones(launchDate, episodeCount);

    return {
      launchDate: new Date(launchDate),
      sealDate,
      productionStartDate,
      hiringStartDate,
      planningStartDate,
      totalProductionDays,
      episodes,
      milestones,
    };
  }
}
