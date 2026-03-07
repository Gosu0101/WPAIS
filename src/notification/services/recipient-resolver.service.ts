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
   * 프로젝트 멤버 역할/담당 공정 수정
   */
  async updateMember(
    memberId: string,
    updates: {
      role?: MemberRole;
      taskType?: TaskType;
    },
  ): Promise<ProjectMember | null> {
    const member = await this.memberRepository.findOne({ where: { id: memberId } });
    if (!member) {
      return null;
    }

    if (updates.role !== undefined) {
      member.role = updates.role;
    }

    if (updates.taskType !== undefined) {
      member.taskType = updates.taskType;
    }

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

  /**
   * 사용자가 접근 가능한 프로젝트 ID 목록 조회
   */
  async getAccessibleProjectIds(userId: string): Promise<string[]> {
    const members = await this.memberRepository.find({
      where: { userId },
      select: ['projectId'],
    });

    return [...new Set(members.map((member) => member.projectId))];
  }

  /**
   * 사용자가 특정 프로젝트에 속해있는지 확인
   */
  async isProjectMember(projectId: string, userId: string): Promise<boolean> {
    const member = await this.memberRepository.findOne({
      where: { projectId, userId },
      select: ['id'],
    });

    return !!member;
  }

  /**
   * 사용자의 프로젝트 멤버십 조회
   */
  async getProjectMembership(
    projectId: string,
    userId: string,
  ): Promise<ProjectMember | null> {
    return this.memberRepository.findOne({
      where: { projectId, userId },
    });
  }

  /**
   * 접근 가능한 프로젝트 ID만 필터링
   */
  async filterAccessibleProjectIds(
    userId: string,
    projectIds?: string[],
  ): Promise<string[]> {
    const accessibleProjectIds = await this.getAccessibleProjectIds(userId);

    if (!projectIds?.length) {
      return accessibleProjectIds;
    }

    const allowedSet = new Set(accessibleProjectIds);
    return projectIds.filter((projectId) => allowedSet.has(projectId));
  }
}
