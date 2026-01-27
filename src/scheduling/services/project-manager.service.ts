import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project, Episode, Milestone, EpisodeStatus, MilestoneType } from '../entities';
import { CreateProjectInput, getDefaultVelocityConfig, MasterSchedule } from '../types';
import { SchedulerService } from './scheduler.service';
import { VelocityConfigService } from './velocity-config.service';
import { Page } from '../../workflow/entities';
import { TaskStatus } from '../../workflow/types';

/**
 * ProjectManager - 프로젝트 생성 및 관리를 담당하는 서비스
 * 
 * 프로젝트 생성, 마일스톤 조회, 런칭일 업데이트 등의 기능을 제공합니다.
 */
@Injectable()
export class ProjectManagerService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(Episode)
    private readonly episodeRepository: Repository<Episode>,
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(Page)
    private readonly pageRepository: Repository<Page>,
    private readonly schedulerService: SchedulerService,
    private readonly velocityConfigService: VelocityConfigService,
  ) {}

  /**
   * 새 프로젝트를 생성하고 스케줄을 계산합니다.
   * 
   * 1. 런칭일을 기준으로 마스터 스케줄 계산
   * 2. 프로젝트 엔티티 생성 및 저장
   * 3. 회차별 에피소드 엔티티 생성 및 저장
   * 4. 마일스톤 엔티티 생성 및 저장
   * 
   * @param input 프로젝트 생성 입력
   * @returns 생성된 프로젝트 (에피소드, 마일스톤 포함)
   * 
   * **Validates: Requirements 1.1, 1.2, 1.3**
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    const { title, launchDate, episodeCount = 10, velocityConfig } = input;

    // 1. 마스터 스케줄 계산
    const masterSchedule = this.schedulerService.calculateMasterSchedule(launchDate, episodeCount);

    // 2. 프로젝트 엔티티 생성
    const project = this.projectRepository.create({
      title,
      launchDate: masterSchedule.launchDate,
      sealDate: masterSchedule.sealDate,
      productionStartDate: masterSchedule.productionStartDate,
      hiringStartDate: masterSchedule.hiringStartDate,
      planningStartDate: masterSchedule.planningStartDate,
      velocityConfig: velocityConfig ?? getDefaultVelocityConfig(),
    });

    // 3. 프로젝트 저장
    const savedProject = await this.projectRepository.save(project);

    // 4. 에피소드 엔티티 생성 및 저장
    const episodes = masterSchedule.episodes.map((episodeSchedule) => {
      return this.episodeRepository.create({
        projectId: savedProject.id,
        episodeNumber: episodeSchedule.episodeNumber,
        dueDate: episodeSchedule.dueDate,
        duration: episodeSchedule.duration,
        status: EpisodeStatus.PENDING,
        isSealed: episodeSchedule.episodeNumber <= 7, // 1~7화는 봉인 대상
      });
    });

    await this.episodeRepository.save(episodes);

    // 5. 각 에피소드에 대해 페이지 생성 (5페이지씩)
    const allPages: Page[] = [];
    for (const episode of episodes) {
      for (let pageNum = 1; pageNum <= 5; pageNum++) {
        const page = this.pageRepository.create({
          episodeId: episode.id,
          pageNumber: pageNum,
          heightPx: 20000,
          backgroundStatus: TaskStatus.READY,
          lineArtStatus: TaskStatus.LOCKED,
          coloringStatus: TaskStatus.LOCKED,
          postProcessingStatus: TaskStatus.LOCKED,
        });
        allPages.push(page);
      }
    }
    await this.pageRepository.save(allPages);

    // 6. 마일스톤 엔티티 생성 및 저장
    const milestones = masterSchedule.milestones.map((milestoneSchedule) => {
      return this.milestoneRepository.create({
        projectId: savedProject.id,
        name: milestoneSchedule.name,
        type: milestoneSchedule.type,
        targetDate: milestoneSchedule.targetDate,
        isCompleted: false,
      });
    });

    await this.milestoneRepository.save(milestones);

    // 7. 관계 포함하여 프로젝트 반환
    return this.projectRepository.findOne({
      where: { id: savedProject.id },
      relations: ['episodes', 'milestones'],
    }) as Promise<Project>;
  }

  /**
   * 프로젝트의 마일스톤 목록을 조회합니다.
   * 
   * @param projectId 프로젝트 ID
   * @returns 마일스톤 목록
   * 
   * **Validates: Requirements 5.3**
   */
  async getMilestones(projectId: string): Promise<Milestone[]> {
    return this.milestoneRepository.find({
      where: { projectId },
      order: { targetDate: 'ASC' },
    });
  }

  /**
   * 런칭일을 업데이트하고 일정을 재계산합니다.
   * 
   * 1. 기존 프로젝트 조회
   * 2. 새로운 런칭일로 마스터 스케줄 재계산
   * 3. 프로젝트 날짜 업데이트
   * 4. 에피소드 마감일 업데이트
   * 5. 마일스톤 날짜 업데이트
   * 
   * @param projectId 프로젝트 ID
   * @param newLaunchDate 새로운 런칭일
   * @returns 업데이트된 프로젝트
   * 
   * **Validates: Requirements 7.1, 7.2**
   */
  async updateLaunchDate(projectId: string, newLaunchDate: Date): Promise<Project> {
    // 1. 기존 프로젝트 조회
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['episodes', 'milestones'],
    });

    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }

    const episodeCount = project.episodes.length;

    // 2. 새로운 런칭일로 마스터 스케줄 재계산
    const newSchedule = this.schedulerService.calculateMasterSchedule(newLaunchDate, episodeCount);

    // 3. 프로젝트 날짜 업데이트
    project.launchDate = newSchedule.launchDate;
    project.sealDate = newSchedule.sealDate;
    project.productionStartDate = newSchedule.productionStartDate;
    project.hiringStartDate = newSchedule.hiringStartDate;
    project.planningStartDate = newSchedule.planningStartDate;
    // velocityConfig는 보존 (Requirements 7.3)

    await this.projectRepository.save(project);

    // 4. 에피소드 마감일 업데이트
    for (const episode of project.episodes) {
      const newEpisodeSchedule = newSchedule.episodes.find(
        (e) => e.episodeNumber === episode.episodeNumber
      );
      if (newEpisodeSchedule) {
        episode.dueDate = newEpisodeSchedule.dueDate;
        episode.duration = newEpisodeSchedule.duration;
      }
    }

    await this.episodeRepository.save(project.episodes);

    // 5. 마일스톤 날짜 업데이트
    for (const milestone of project.milestones) {
      const newMilestoneSchedule = newSchedule.milestones.find(
        (m) => m.type === milestone.type
      );
      if (newMilestoneSchedule) {
        milestone.targetDate = newMilestoneSchedule.targetDate;
      }
    }

    await this.milestoneRepository.save(project.milestones);

    // 6. 업데이트된 프로젝트 반환
    return this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['episodes', 'milestones'],
    }) as Promise<Project>;
  }

  /**
   * 프로젝트를 ID로 조회합니다.
   * 
   * @param projectId 프로젝트 ID
   * @returns 프로젝트 (에피소드, 마일스톤 포함) 또는 null
   */
  async getProject(projectId: string): Promise<Project | null> {
    return this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['episodes', 'milestones'],
    });
  }
}
