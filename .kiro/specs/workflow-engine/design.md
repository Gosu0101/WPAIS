# Design Document: Workflow Engine

## Overview

WPAIS 워크플로우 엔진은 웹툰 제작의 페이지 단위 작업 관리와 '스테이지 퍼스트' 의존성 기반의 공정 릴레이 로직을 담당합니다. 배경→선화→채색→후보정 순서의 강한 의존성을 시스템적으로 강제하여 제작 품질을 보장합니다.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    WorkflowModule                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │    Page      │    │    Task      │    │  TaskStatus  │  │
│  │   Entity     │───▶│   Entity     │───▶│    Enum      │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                               │
│         ▼                   ▼                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              WorkflowEngineService                    │  │
│  │  - completeTask()                                     │  │
│  │  - validateTransition()                               │  │
│  │  - unlockNextTask()                                   │  │
│  │  - calculateProgress()                                │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                  │
│                          ▼                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              EventEmitter                             │  │
│  │  - TaskUnlockedEvent                                  │  │
│  │  - EpisodeCompletedEvent                              │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Enums

```typescript
enum TaskType {
  BACKGROUND = 'BACKGROUND',
  LINE_ART = 'LINE_ART',
  COLORING = 'COLORING',
  POST_PROCESSING = 'POST_PROCESSING'
}

enum TaskStatus {
  LOCKED = 'LOCKED',
  READY = 'READY',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE'
}
```

### Page Entity

```typescript
interface Page {
  id: string;
  episodeId: string;
  pageNumber: number;        // 1-5
  heightPx: number;          // 20000 (fixed)
  backgroundStatus: TaskStatus;
  lineArtStatus: TaskStatus;
  coloringStatus: TaskStatus;
  postProcessingStatus: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
}
```

### WorkflowEngineService Interface

```typescript
interface IWorkflowEngineService {
  // 공정 완료 처리
  completeTask(pageId: string, taskType: TaskType): Promise<Page>;
  
  // 작업 시작 (READY → IN_PROGRESS)
  startTask(pageId: string, taskType: TaskType): Promise<Page>;
  
  // 상태 전이 검증
  validateTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean;
  
  // 의존성 검증
  validateDependency(page: Page, taskType: TaskType): boolean;
  
  // 다음 공정 자동 해제
  unlockNextTask(page: Page, completedTaskType: TaskType): Promise<Page>;
  
  // 에피소드 진행률 계산
  calculateEpisodeProgress(episodeId: string): Promise<EpisodeProgress>;
  
  // 페이지 초기화 (Episode 생성 시)
  initializePages(episodeId: string, count: number): Promise<Page[]>;
}
```

### Event Types

```typescript
interface TaskUnlockedEvent {
  pageId: string;
  taskType: TaskType;
  timestamp: Date;
}

interface EpisodeCompletedEvent {
  episodeId: string;
  completedAt: Date;
}

interface EpisodeProgress {
  episodeId: string;
  totalTasks: number;        // 20 (5 pages × 4 stages)
  completedTasks: number;
  percentage: number;
  byTaskType: {
    [key in TaskType]: {
      total: number;
      completed: number;
      percentage: number;
    };
  };
}
```

## Data Models

### Page Entity (TypeORM)

```typescript
@Entity('pages')
class PageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  episodeId: string;

  @ManyToOne(() => EpisodeEntity, episode => episode.pages)
  @JoinColumn({ name: 'episodeId' })
  episode: EpisodeEntity;

  @Column('int')
  pageNumber: number;  // 1-5

  @Column('int', { default: 20000 })
  heightPx: number;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.READY
  })
  backgroundStatus: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.LOCKED
  })
  lineArtStatus: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.LOCKED
  })
  coloringStatus: TaskStatus;

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.LOCKED
  })
  postProcessingStatus: TaskStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Dependency Chain

```
BACKGROUND ──(DONE)──▶ LINE_ART ──(DONE)──▶ COLORING ──(DONE)──▶ POST_PROCESSING
   │                      │                     │                      │
   ▼                      ▼                     ▼                      ▼
 READY               LOCKED→READY          LOCKED→READY           LOCKED→READY
```

### State Machine

```
┌────────┐   workflow   ┌───────┐   user    ┌─────────────┐   user   ┌──────┐
│ LOCKED │─────────────▶│ READY │──────────▶│ IN_PROGRESS │─────────▶│ DONE │
└────────┘   unlock     └───────┘   start   └─────────────┘  complete└──────┘
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Page Initialization Invariant

*For any* newly created Episode, the system SHALL generate exactly 5 Pages with:
- Sequential page numbers (1-5)
- BACKGROUND status as READY
- All other statuses (LINE_ART, COLORING, POST_PROCESSING) as LOCKED
- Height fixed at 20,000px

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Stage-First Dependency Enforcement

*For any* Page and *for any* TaskType T where T ≠ BACKGROUND:
- IF the predecessor task is not DONE
- THEN attempting to start task T SHALL throw LockedException

Dependency chain: BACKGROUND → LINE_ART → COLORING → POST_PROCESSING

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 3: Auto-Unlock Chain

*For any* Page, when a task of type T completes (status → DONE):
- The immediate successor task SHALL automatically transition from LOCKED to READY
- A TaskUnlockedEvent SHALL be emitted

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 4: Valid State Transitions Only

*For any* Task status transition attempt:
- Only these transitions are valid: LOCKED→READY (by workflow), READY→IN_PROGRESS, IN_PROGRESS→DONE
- Any other transition SHALL throw InvalidStateTransitionError

**Validates: Requirements 2.3, 2.4, 2.5, 6.1, 6.2**

### Property 5: Episode Progress Calculation

*For any* Episode with N completed tasks (out of 20 total):
- Progress percentage SHALL equal (N / 20) × 100
- When N = 20, Episode status SHALL be COMPLETED

**Validates: Requirements 5.1, 5.2**

### Property 6: Task Unlock Event Emission

*For any* task status change to READY:
- A TaskUnlockedEvent SHALL be emitted
- The event SHALL contain valid pageId, taskType, and timestamp

**Validates: Requirements 7.1, 7.2**

## Error Handling

### Custom Exceptions

```typescript
class LockedException extends Error {
  constructor(
    public readonly pageId: string,
    public readonly taskType: TaskType,
    public readonly requiredPredecessor: TaskType
  ) {
    super(`Task ${taskType} is locked. ${requiredPredecessor} must be DONE first.`);
  }
}

class InvalidStateTransitionError extends Error {
  constructor(
    public readonly currentStatus: TaskStatus,
    public readonly attemptedStatus: TaskStatus
  ) {
    super(`Invalid transition from ${currentStatus} to ${attemptedStatus}`);
  }
}
```

## Testing Strategy

### Unit Tests
- Page entity creation and initialization
- State transition validation
- Dependency chain validation
- Progress calculation accuracy

### Property-Based Tests (fast-check)
- Property 1: Page initialization invariant
- Property 2: Stage-first dependency enforcement
- Property 3: Auto-unlock chain behavior
- Property 4: Valid state transitions only
- Property 5: Episode progress calculation
- Property 6: Task unlock event emission

### Integration Tests
- Full workflow from Episode creation to completion
- Event emission and handling
- Database persistence of state changes
