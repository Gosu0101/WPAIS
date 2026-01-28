# Design: 알림 시스템 (Notification System)

## Overview

기존 Alert 시스템을 확장하여 마감 임박 알림, 작업자별 알림, 역할 기반 알림 수신 기능을 구현합니다.

## Architecture

### 모듈 구조

```
src/notification/
├── notification.module.ts
├── entities/
│   ├── notification.entity.ts      # 개인별 알림
│   ├── notification-setting.entity.ts
│   └── project-member.entity.ts    # 프로젝트 멤버/담당자
├── services/
│   ├── notification.service.ts     # 알림 생성/조회
│   ├── notification-scheduler.service.ts  # 마감 체크 스케줄러
│   └── recipient-resolver.service.ts      # 수신자 결정
├── types/
│   └── notification.types.ts
└── index.ts
```

### 기존 시스템과의 관계

```
┌─────────────────┐     ┌─────────────────┐
│  Alert (기존)   │     │  Notification   │
│  - 시스템 알림  │     │  - 개인별 알림  │
│  - 프로젝트 단위│     │  - 수신자 지정  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     │
              ┌──────▼──────┐
              │ AlertService│
              │ (확장)      │
              └─────────────┘
```

## Data Models

### Notification Entity

```typescript
@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('uuid')
  recipientId: string;  // 수신자 ID

  @Column({ type: 'varchar' })
  notificationType: NotificationType;

  @Column({ type: 'varchar' })
  severity: AlertSeverity;

  @Column('text')
  title: string;

  @Column('text')
  message: string;

  @Column('simple-json', { nullable: true })
  metadata?: Record<string, unknown>;

  @Column({ default: false })
  isRead: boolean;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
```

### ProjectMember Entity (담당자 관리)

```typescript
@Entity('project_members')
export class ProjectMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('uuid')
  userId: string;

  @Column({ type: 'varchar' })
  role: MemberRole;  // PD, BACKGROUND, LINE_ART, COLORING, POST_PROCESSING

  @Column({ type: 'varchar', nullable: true })
  taskType: TaskType | null;  // 공정 담당자인 경우

  @CreateDateColumn()
  createdAt: Date;
}

export enum MemberRole {
  PD = 'PD',
  WORKER = 'WORKER',
}
```

### NotificationSetting Entity

```typescript
@Entity('notification_settings')
export class NotificationSetting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  projectId: string;

  @Column('uuid')
  userId: string;

  @Column('simple-json')
  enabledTypes: NotificationType[];

  @Column('simple-json')
  thresholds: {
    task: number[];      // [3, 1, 0]
    episode: number[];   // [7, 3, 1]
    milestone: number[]; // [14, 7, 3, 1]
  };

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### NotificationType Enum

```typescript
export enum NotificationType {
  // 마감 임박
  TASK_DEADLINE_APPROACHING = 'TASK_DEADLINE_APPROACHING',
  EPISODE_DEADLINE_APPROACHING = 'EPISODE_DEADLINE_APPROACHING',
  MILESTONE_DEADLINE_APPROACHING = 'MILESTONE_DEADLINE_APPROACHING',
  
  // 작업 상태 변경
  TASK_STARTED = 'TASK_STARTED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  NEXT_TASK_READY = 'NEXT_TASK_READY',  // 다음 공정 담당자용
  EPISODE_COMPLETED = 'EPISODE_COMPLETED',
}
```

## Core Services

### RecipientResolverService

```typescript
@Injectable()
export class RecipientResolverService {
  /**
   * 알림 수신자 결정
   * - PD는 모든 알림 수신
   * - 작업자는 자신의 공정 관련 알림만 수신
   */
  async resolveRecipients(
    projectId: string,
    notificationType: NotificationType,
    context: { taskType?: TaskType; nextTaskType?: TaskType }
  ): Promise<string[]> {
    const recipients: string[] = [];
    
    // PD는 항상 수신
    const pds = await this.getProjectPDs(projectId);
    recipients.push(...pds.map(pd => pd.userId));
    
    // 다음 공정 담당자 알림인 경우
    if (notificationType === NotificationType.NEXT_TASK_READY && context.nextTaskType) {
      const nextWorker = await this.getTaskWorker(projectId, context.nextTaskType);
      if (nextWorker) {
        recipients.push(nextWorker.userId);
      }
    }
    
    return [...new Set(recipients)]; // 중복 제거
  }
}
```

### NotificationService

```typescript
@Injectable()
export class NotificationService {
  /**
   * 작업 완료 시 알림 생성
   * - PD에게 작업 완료 알림
   * - 다음 공정 담당자에게 작업 준비 알림
   */
  async notifyTaskCompleted(event: TaskCompletedEvent): Promise<void> {
    const { projectId, episodeNumber, pageNumber, taskType, nextTaskType } = event;
    
    // 1. PD에게 작업 완료 알림
    const pds = await this.recipientResolver.getProjectPDs(projectId);
    for (const pd of pds) {
      await this.createNotification({
        projectId,
        recipientId: pd.userId,
        notificationType: NotificationType.TASK_COMPLETED,
        title: `${taskType} 작업 완료`,
        message: `EP${episodeNumber} P${pageNumber} ${taskType} 작업이 완료되었습니다.`,
        metadata: { episodeNumber, pageNumber, taskType, nextTaskType },
      });
    }
    
    // 2. 다음 공정 담당자에게 알림 (후보정이 아닌 경우)
    if (nextTaskType) {
      const nextWorker = await this.recipientResolver.getTaskWorker(projectId, nextTaskType);
      if (nextWorker) {
        await this.createNotification({
          projectId,
          recipientId: nextWorker.userId,
          notificationType: NotificationType.NEXT_TASK_READY,
          title: `${nextTaskType} 작업 준비`,
          message: `EP${episodeNumber} P${pageNumber} ${nextTaskType} 작업을 시작할 수 있습니다.`,
          metadata: { episodeNumber, pageNumber, previousTaskType: taskType, taskType: nextTaskType },
        });
      }
    }
  }
}
```

### NotificationSchedulerService

```typescript
@Injectable()
export class NotificationSchedulerService {
  /**
   * 매일 오전 9시에 마감 임박 체크
   */
  @Cron('0 9 * * *')
  async checkDeadlines(): Promise<void> {
    const projects = await this.projectRepository.find({ where: { isActive: true } });
    
    for (const project of projects) {
      await this.checkTaskDeadlines(project.id);
      await this.checkEpisodeDeadlines(project.id);
      await this.checkMilestoneDeadlines(project.id);
    }
  }
  
  private async checkTaskDeadlines(projectId: string): Promise<void> {
    const thresholds = [3, 1, 0]; // 기본값
    const today = new Date();
    
    const pages = await this.pageRepository.find({
      where: { episode: { projectId } },
      relations: ['episode'],
    });
    
    for (const page of pages) {
      for (const taskType of ['BACKGROUND', 'LINE_ART', 'COLORING', 'POST_PROCESSING']) {
        const dueDate = page[`${taskType.toLowerCase()}DueDate`];
        const status = page[`${taskType.toLowerCase()}Status`];
        
        if (status === TaskStatus.DONE || !dueDate) continue;
        
        const daysRemaining = this.getDaysRemaining(today, dueDate);
        
        if (thresholds.includes(daysRemaining)) {
          await this.createDeadlineNotification(projectId, page, taskType, daysRemaining);
        }
      }
    }
  }
}
```

## API Endpoints

### Notification API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/notifications` | 내 알림 목록 조회 |
| GET | `/api/notifications/unread-count` | 미확인 알림 수 |
| POST | `/api/notifications/:id/read` | 알림 확인 처리 |
| POST | `/api/notifications/read-all` | 전체 확인 처리 |

### Project Member API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/members` | 프로젝트 멤버 목록 |
| POST | `/api/projects/:id/members` | 멤버 추가 |
| PATCH | `/api/projects/:id/members/:memberId` | 멤버 역할 변경 |
| DELETE | `/api/projects/:id/members/:memberId` | 멤버 제거 |

### Notification Setting API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/notification-settings` | 알림 설정 조회 |
| PATCH | `/api/projects/:id/notification-settings` | 알림 설정 변경 |

## Event Flow

### 작업 완료 시 알림 흐름

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ PageController│    │WorkflowEngine    │     │NotificationSvc  │
│ complete()   │───▶│ completeTask()   │───▶│notifyTaskCompleted│
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    │                                 │                                 │
                    ▼                                 ▼                                 ▼
            ┌───────────────┐               ┌───────────────┐               ┌───────────────┐
            │ PD 알림       │               │ 다음 담당자   │               │ Alert (기존)  │
            │ TASK_COMPLETED│               │ NEXT_TASK_READY│              │ 시스템 로그   │
            └───────────────┘               └───────────────┘               └───────────────┘
```

## Correctness Properties

### Property 1: PD는 모든 알림 수신
```
∀ notification ∈ Notifications:
  ∃ pd ∈ ProjectMembers where pd.role = 'PD':
    notification.recipientId = pd.userId OR
    notification.notificationType ∈ {NEXT_TASK_READY}
```
**Validates: Requirements 2.3, 3.1**

### Property 2: 작업 완료 시 다음 담당자 알림
```
∀ taskCompleted where nextTaskType ≠ null:
  ∃ notification where:
    notification.notificationType = 'NEXT_TASK_READY' AND
    notification.recipientId = getTaskWorker(nextTaskType).userId
```
**Validates: Requirements 2.2**

### Property 3: 마감 임박 알림 중복 방지
```
∀ (item, threshold) pair:
  count(notifications where 
    item.id = notification.metadata.itemId AND
    threshold = notification.metadata.daysRemaining
  ) ≤ 1
```
**Validates: Requirements 6.1**

### Property 4: 완료된 항목은 마감 알림 없음
```
∀ item where item.status = 'DONE':
  ¬∃ notification where:
    notification.notificationType ∈ {DEADLINE_APPROACHING} AND
    notification.metadata.itemId = item.id AND
    notification.createdAt > item.completedAt
```
**Validates: Requirements 1.1, 1.2, 1.3**

## Testing Strategy

### Unit Tests
- RecipientResolverService: 역할별 수신자 결정 로직
- NotificationService: 알림 생성 로직
- NotificationSchedulerService: 마감 체크 로직

### Integration Tests
- 작업 완료 → 알림 생성 → 수신자 확인
- 스케줄러 실행 → 마감 임박 알림 생성

### Property-Based Tests (fast-check)
- PD 알림 수신 검증
- 다음 담당자 알림 검증
- 중복 알림 방지 검증

## Dependencies

### 신규 패키지
- `@nestjs/schedule`: Cron 스케줄러

### 기존 모듈 연동
- MonitorModule: Alert 시스템 연동
- WorkflowModule: 작업 상태 변경 이벤트 수신
- SchedulingModule: 프로젝트/에피소드/마일스톤 정보 조회
