import { Injectable } from '@nestjs/common';
import { VelocityConfigService } from './velocity-config.service';
import { EpisodeSchedule, MasterSchedule, MilestoneSchedule, ValidationResult, ValidationWarning } from '../types';
import { MilestoneType } from '../entities';
import { InsufficientTimeError } from '../errors';

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

  /**
   * 계산된 일정의 유효성을 검증합니다.
   * 
   * 검증 항목:
   * 1. 제작 시작일이 미래인지 확인
   * 2. 모든 마일스톤 날짜가 유효한 제작 기간 내에 있는지 확인
   * 3. 마일스톤 날짜 충돌 검사
   * 
   * @param schedule 검증할 스케줄
   * @param currentDate 현재 날짜 (기본값: 오늘)
   * @returns 유효성 검증 결과
   */
  validateSchedule(schedule: MasterSchedule, currentDate: Date = new Date()): ValidationResult {
    const errors: string[] = [];
    const warnings: ValidationWarning[] = [];

    // 1. 제작 시작일이 미래인지 검증 (Requirements 6.1, 6.2)
    if (schedule.productionStartDate.getTime() <= currentDate.getTime()) {
      errors.push(
        `Insufficient time: Production would need to start on ${schedule.productionStartDate.toISOString()}, ` +
        `but current date is ${currentDate.toISOString()}.`
      );
    }

    // 2. 모든 마일스톤 날짜가 유효한 제작 기간 내에 있는지 확인 (Requirements 6.3)
    const validPeriodStart = schedule.planningStartDate;
    const validPeriodEnd = schedule.launchDate;

    for (const milestone of schedule.milestones) {
      if (milestone.targetDate.getTime() < validPeriodStart.getTime()) {
        errors.push(
          `Milestone "${milestone.name}" target date ${milestone.targetDate.toISOString()} ` +
          `is before the planning start date ${validPeriodStart.toISOString()}.`
        );
      }
      if (milestone.targetDate.getTime() > validPeriodEnd.getTime()) {
        errors.push(
          `Milestone "${milestone.name}" target date ${milestone.targetDate.toISOString()} ` +
          `is after the launch date ${validPeriodEnd.toISOString()}.`
        );
      }
    }

    // 3. 마일스톤 날짜 충돌 검사 (Requirements 6.4)
    const milestonesByDate = new Map<number, MilestoneSchedule[]>();
    for (const milestone of schedule.milestones) {
      const dateKey = milestone.targetDate.getTime();
      if (!milestonesByDate.has(dateKey)) {
        milestonesByDate.set(dateKey, []);
      }
      milestonesByDate.get(dateKey)!.push(milestone);
    }

    for (const [dateKey, milestones] of milestonesByDate) {
      if (milestones.length > 1) {
        // 채용 완료와 제작 시작은 같은 날짜일 수 있음 (정상적인 케이스)
        const isNormalConflict = milestones.every(
          m => m.type === MilestoneType.HIRING_COMPLETE || m.type === MilestoneType.PRODUCTION_START
        );
        
        if (!isNormalConflict) {
          warnings.push({
            code: 'MILESTONE_DATE_CONFLICT',
            message: `Multiple milestones on the same date: ${milestones.map(m => m.name).join(', ')}`,
            dates: [new Date(dateKey)],
          });
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 일정 유효성을 검증하고, 유효하지 않으면 에러를 throw합니다.
   * 
   * @param schedule 검증할 스케줄
   * @param currentDate 현재 날짜 (기본값: 오늘)
   * @throws InsufficientTimeError 제작 시작일이 과거인 경우
   */
  validateScheduleOrThrow(schedule: MasterSchedule, currentDate: Date = new Date()): void {
    const result = this.validateSchedule(schedule, currentDate);
    
    if (!result.isValid) {
      // 제작 시작일이 과거인 경우 InsufficientTimeError throw
      if (schedule.productionStartDate.getTime() <= currentDate.getTime()) {
        throw new InsufficientTimeError(
          schedule.launchDate,
          schedule.productionStartDate,
          currentDate
        );
      }
      
      // 그 외의 에러는 일반 Error로 throw
      throw new Error(result.errors.join('\n'));
    }
  }

  /**
   * 런칭일 변경 시 전체 일정을 재계산합니다.
   * 
   * 기존 스케줄의 velocityConfig를 보존하면서 새로운 런칭일을 기준으로
   * 모든 마일스톤 날짜와 회차별 마감일을 재계산합니다.
   * 
   * @param existingSchedule 기존 마스터 스케줄
   * @param newLaunchDate 새로운 런칭일
   * @returns 재계산된 마스터 스케줄
   * 
   * **Validates: Requirements 7.1, 7.2, 7.3, 7.4**
   */
  recalculateSchedule(existingSchedule: MasterSchedule, newLaunchDate: Date): MasterSchedule {
    // 기존 스케줄의 회차 수를 보존
    const episodeCount = existingSchedule.episodes.length;
    
    if (episodeCount < 1) {
      throw new Error(`Invalid episode count: ${episodeCount}. Episode count must be a positive integer.`);
    }

    // velocityConfig는 VelocityConfigService에서 관리되므로 자동으로 보존됨
    // 새로운 런칭일로 전체 스케줄 재계산
    return this.calculateMasterSchedule(newLaunchDate, episodeCount);
  }

  /**
   * 공정별 마감일을 계산합니다.
   * 
   * 에피소드 기간을 4개 공정(배경, 선화, 채색, 후보정)에 균등 분배합니다.
   * 각 공정은 순차적으로 진행되므로 마감일이 누적됩니다.
   * 
   * 예시 (14일 에피소드, 시작일 1월 1일):
   * - 배경 마감: 1월 4일 (3.5일 후)
   * - 선화 마감: 1월 8일 (7일 후)
   * - 채색 마감: 1월 11일 (10.5일 후)
   * - 후보정 마감: 1월 15일 (14일 후 = 에피소드 마감일)
   * 
   * @param episodeStartDate 에피소드 시작일
   * @param episodeDuration 에피소드 제작 기간 (일 단위)
   * @returns 공정별 마감일 객체
   */
  calculateTaskDueDates(
    episodeStartDate: Date,
    episodeDuration: number,
  ): {
    backgroundDueDate: Date;
    lineArtDueDate: Date;
    coloringDueDate: Date;
    postProcessingDueDate: Date;
  } {
    // 각 공정에 25%씩 균등 분배
    const taskDuration = episodeDuration / 4;
    
    const backgroundDueDate = new Date(episodeStartDate);
    backgroundDueDate.setDate(backgroundDueDate.getDate() + Math.ceil(taskDuration));
    
    const lineArtDueDate = new Date(episodeStartDate);
    lineArtDueDate.setDate(lineArtDueDate.getDate() + Math.ceil(taskDuration * 2));
    
    const coloringDueDate = new Date(episodeStartDate);
    coloringDueDate.setDate(coloringDueDate.getDate() + Math.ceil(taskDuration * 3));
    
    const postProcessingDueDate = new Date(episodeStartDate);
    postProcessingDueDate.setDate(postProcessingDueDate.getDate() + episodeDuration);
    
    return {
      backgroundDueDate,
      lineArtDueDate,
      coloringDueDate,
      postProcessingDueDate,
    };
  }

  /**
   * 에피소드 스케줄에서 공정별 마감일을 계산합니다.
   * 
   * @param episodeSchedule 에피소드 스케줄
   * @returns 공정별 마감일 객체
   */
  calculateTaskDueDatesFromSchedule(
    episodeSchedule: EpisodeSchedule,
  ): {
    backgroundDueDate: Date;
    lineArtDueDate: Date;
    coloringDueDate: Date;
    postProcessingDueDate: Date;
  } {
    return this.calculateTaskDueDates(episodeSchedule.startDate, episodeSchedule.duration);
  }
}
