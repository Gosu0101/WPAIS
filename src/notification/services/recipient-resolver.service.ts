import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectMember } from '../entities';
import { MemberRole, NotificationType } from '../types';
import { TaskType } from '../../workflow/types';

export interface RecipientContext {
  taskType?: TaskType;
  nextTaskType?: TaskType;
}

@Injectable()
export class RecipientResolverService {
  constructor(
    @InjectRepository(ProjectMember)
    private readonly memberRepository: Repository<ProjectMember>,
  ) {}

  /**
   * 프로젝트의 PD 목록 조회
   */
  async getProjectPDs(projectId: string): Promise<ProjectMember[]> {
    return this.memberRepository.find({
      where: { projectId, role: MemberRole.PD },
    });
  }

  /**
   * 특정 공정의 담당자 조회
   */
  async getTaskWorker(
    projectId: string,
    taskType: TaskType,
  ): Promise<ProjectMember | null> {
    return this.memberRepository.findOne({
      where: { projectId, taskType, role: MemberRole.WORKER },
    });
  }

  /**
   * 알림 유형별 수신자 결정
   * - PD는 모든 알림 수신
   * - NEXT_TASK_READY는 다음 공정 담당자에게만 전송
   */
  async resolveRecipients(
    projectId: string,
    notificationType: NotificationType,
    context: RecipientContext = {},
  ): Promise<string[]> {
    const recipients: string[] = [];

    // NEXT_TASK_READY는 다음 담당자에게만 전송 (PD 제외)
    if (
      notificationType === NotificationType.NEXT_TASK_READY &&
      context.nextTaskType
    ) {
      const nextWorker = await this.getTaskWorker(
        projectId,
        context.nextTaskType,
      );
      if (nextWorker) {
        recipients.push(nextWorker.userId);
      }
      return [...new Set(recipients)];
    }

    // 그 외 모든 알림은 PD에게 전송
    const pds = await this.getProjectPDs(projectId);
    recipients.push(...pds.map((pd) => pd.userId));

    return [...new Set(recipients)];
  }

  /**
   * 프로젝트 멤버 추가
   */
  async addMember(
    projectId: string,
    userId: string,
    role: MemberRole,
    taskType?: TaskType,
  ): Promise<ProjectMember> {
    const member = this.memberRepository.create({
      projectId,
      userId,
      role,
      taskType: taskType || null,
    });
    return this.memberRepository.save(member);
  }

  /**
   * 프로젝트 멤버 제거
   */
  async removeMember(memberId: string): Promise<void> {
    await this.memberRepository.delete(memberId);
  }

  /**
   * 프로젝트 멤버 목록 조회
   */
  async getProjectMembers(projectId: string): Promise<ProjectMember[]> {
    return this.memberRepository.find({ where: { projectId } });
  }
}
