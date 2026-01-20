# Design Document: Scheduling Engine

## Overview

스케줄링 엔진은 WPAIS의 핵심 모듈로, 웹툰 런칭일을 기준으로 역산하여 전체 제작 일정을 자동으로 계산합니다. '적응 가속도(Adaptive Learning Curve)' 로직을 통해 초반 10화는 2주, 이후 회차는 1주의 제작 기간을 할당하며, 이를 통해 연재 초기 퀄리티 안정화를 시스템적으로 보장합니다.

### Key Design Decisions

1. **역산 기반 스케줄링**: 런칭일에서 거꾸로 계산하여 모든 마일스톤 날짜를 도출
2. **가중치 기반 기간 계산**: 회차 번호에 따라 동적으로 제작 기간을 결정
3. **불변 봉인일 원칙**: 런칭 30일 전 봉인일은 변경 불가능한 하드 데드라인
4. **마일스톤 기반 진행 추적**: 3화/5화/7화 체크포인트로 진행 상황 모니터링

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Scheduling Engine                         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ SchedulerService│  │ ProjectManager  │  │ DateCalculator│ │
│  │                 │  │                 │  │             │ │
│  │ - calculateAll  │  │ - createProject │  │ - addDays   │ │
│  │ - recalculate   │  │ - updateLaunch  │  │ - subDays   │ │
│  │ - validate      │  │ - getMilestones │  │ - diffDays  │ │
│  └────────┬────────┘  └────────┬────────┘  └──────┬──────┘ │
│           │                    │                   │        │
│           └────────────────────┼───────────────────┘        │
│                                │                            │
│  ┌─────────────────────────────┴─────────────────────────┐  │
│  │              VelocityConfigService                     │  │
│  │                                                        │  │
│  │  - getDuration(episodeNumber): number                  │  │
│  │  - getConfig(): VelocityConfig                         │  │
│  │  - isLearningPeriod(episodeNumber): boolean            │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      Database Layer                          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Project   │  │   Episode   │  │     Milestone       │  │
│  │             │  │             │  │                     │  │
│  │ - id        │  │ - id        │  │ - id                │  │
│  │ - title     │  │ - projectId │  │ - projectId         │  │
│  │ - launchDate│  │ - epNumber  │  │ - name              │  │
│  │ - sealDate  │  │ - dueDate   │  │ - targetDate        │  │
│  │ - velocity  │  │ - status    │  │ - isCompleted       │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### SchedulerService

스케줄링의 핵심 로직을 담당하는 메인 서비스입니다.

```typescript
interface SchedulerService {
  /**
   * 런칭일을 기준으로 전체 마스터 스케줄을 계산합니다.
   * @param launchDate 런칭 목표일
   * @param episodeCount 런칭 시 확보할 회차 수 (기본값: 10)
   * @returns 계산된 마스터 스케줄
   */
  calculateMasterSchedule(launchDate: Date, episodeCount?: number): MasterSchedule;

  /**
   * 특정 회차의 제작 기간을 반환합니다.
   * @param episodeNumber 회차 번호
   * @returns 제작 기간 (일 단위)
   */
  calculateDuration(episodeNumber: number): number;

  /**
   * 런칭일 변경 시 전체 일정을 재계산합니다.
   * @param projectId 프로젝트 ID
   * @param newLaunchDate 새로운 런칭일
   * @returns 재계산된 마스터 스케줄
   */
  recalculateSchedule(projectId: string, newLaunchDate: Date): MasterSchedule;

  /**
   * 계산된 일정의 유효성을 검증합니다.
   * @param schedule 검증할 스케줄
   * @returns 유효성 검증 결과
   */
  validateSchedule(schedule: MasterSchedule): ValidationResult;
}
```

### VelocityConfigService

적응 가속도 로직을 관리하는 서비스입니다.

```typescript
interface VelocityConfigService {
  /**
   * 회차 번호에 따른 제작 기간을 반환합니다.
   * @param episodeNumber 회차 번호
   * @returns 제작 기간 (일 단위)
   */
  getDuration(episodeNumber: number): number;

  /**
   * 해당 회차가 적응기(Learning Period)인지 확인합니다.
   * @param episodeNumber 회차 번호
   * @returns 적응기 여부
   */
  isLearningPeriod(episodeNumber: number): boolean;

  /**
   * 현재 가중치 설정을 반환합니다.
   * @returns 가중치 설정 객체
   */
  getConfig(): VelocityConfig;
}
```

### ProjectManager

프로젝트 생성 및 관리를 담당합니다.

```typescript
interface ProjectManager {
  /**
   * 새 프로젝트를 생성하고 스케줄을 계산합니다.
   * @param input 프로젝트 생성 입력
   * @returns 생성된 프로젝트
   */
  createProject(input: CreateProjectInput): Project;

  /**
   * 프로젝트의 마일스톤 목록을 조회합니다.
   * @param projectId 프로젝트 ID
   * @returns 마일스톤 목록
   */
  getMilestones(projectId: string): Milestone[];

  /**
   * 런칭일을 업데이트하고 일정을 재계산합니다.
   * @param projectId 프로젝트 ID
   * @param newLaunchDate 새로운 런칭일
   * @returns 업데이트된 프로젝트
   */
  updateLaunchDate(projectId: string, newLaunchDate: Date): Project;
}
```

## Data Models

### Project Entity

```typescript
interface Project {
  id: string;                    // UUID
  title: string;                 // 작품명
  launchDate: Date;              // 런칭 목표일
  sealDate: Date;                // 7화 봉인일 (런칭일 - 30일)
  productionStartDate: Date;     // 제작 시작일
  hiringStartDate: Date;         // 채용 시작일
  planningStartDate: Date;       // 기획 시작일
  velocityConfig: VelocityConfig; // 가중치 설정
  createdAt: Date;
  updatedAt: Date;
}
```

### Episode Entity

```typescript
interface Episode {
  id: string;                    // UUID
  projectId: string;             // 프로젝트 FK
  episodeNumber: number;         // 회차 번호 (1, 2, 3, ...)
  dueDate: Date;                 // 마감일
  duration: number;              // 제작 기간 (일)
  status: EpisodeStatus;         // 상태 (PENDING, IN_PROGRESS, COMPLETED)
  isSealed: boolean;             // 봉인 여부 (1~7화)
  createdAt: Date;
  updatedAt: Date;
}

enum EpisodeStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED'
}
```

### Milestone Entity

```typescript
interface Milestone {
  id: string;                    // UUID
  projectId: string;             // 프로젝트 FK
  name: string;                  // 마일스톤 이름
  type: MilestoneType;           // 마일스톤 유형
  targetDate: Date;              // 목표 날짜
  isCompleted: boolean;          // 완료 여부
  completedAt?: Date;            // 완료 일시
}

enum MilestoneType {
  PLANNING_COMPLETE = 'PLANNING_COMPLETE',
  HIRING_COMPLETE = 'HIRING_COMPLETE',
  PRODUCTION_START = 'PRODUCTION_START',
  EPISODE_3_COMPLETE = 'EPISODE_3_COMPLETE',
  EPISODE_5_COMPLETE = 'EPISODE_5_COMPLETE',
  EPISODE_7_SEAL = 'EPISODE_7_SEAL',
  LAUNCH = 'LAUNCH'
}
```

### VelocityConfig

```typescript
interface VelocityConfig {
  learningPeriodEnd: number;     // 적응기 종료 회차 (기본값: 10)
  learningPeriodDuration: number; // 적응기 회차당 기간 (기본값: 14일)
  normalPeriodDuration: number;   // 정상기 회차당 기간 (기본값: 7일)
}

// JSON 저장 형태 예시
// {"learningPeriodEnd": 10, "learningPeriodDuration": 14, "normalPeriodDuration": 7}
```

### MasterSchedule

```typescript
interface MasterSchedule {
  projectId: string;
  launchDate: Date;
  sealDate: Date;
  productionStartDate: Date;
  hiringStartDate: Date;
  planningStartDate: Date;
  totalProductionDays: number;
  episodes: EpisodeSchedule[];
  milestones: Milestone[];
}

interface EpisodeSchedule {
  episodeNumber: number;
  startDate: Date;
  dueDate: Date;
  duration: number;
  isLearningPeriod: boolean;
}
```



## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Seal Date Calculation

*For any* valid launch date, the calculated seal date SHALL equal the launch date minus exactly 30 days.

**Validates: Requirements 1.1, 3.1**

### Property 2: Duration Calculation by Episode Number

*For any* episode number, the calculated duration SHALL be:
- 14 days if episode number is between 1 and 10 (inclusive)
- 7 days if episode number is 11 or greater

**Validates: Requirements 2.1, 2.2**

### Property 3: Project Data Round-Trip

*For any* valid project creation input, creating a project and then querying it SHALL return a project with identical launch date, seal date, and velocity configuration values.

**Validates: Requirements 1.3, 4.4**

### Property 4: Production Start Date Calculation

*For any* launch date and episode count, the production start date SHALL equal the seal date minus the total production duration, where total production duration is the sum of all episode durations.

**Validates: Requirements 1.2, 3.2**

### Property 5: Episode Due Date Ordering

*For any* project with multiple episodes, episode N's due date SHALL be strictly before episode N+1's due date for all consecutive episode pairs.

**Validates: Requirements 4.1**

### Property 6: Episode Spacing Consistency

*For any* project:
- Episodes 1-10 SHALL have due dates spaced exactly 14 days apart
- Episodes 11+ SHALL have due dates spaced exactly 7 days apart from the previous episode

**Validates: Requirements 4.2, 4.3**

### Property 7: Milestone Date Relationships

*For any* project, the following date ordering SHALL hold:
planningStartDate < hiringStartDate < productionStartDate < sealDate < launchDate

Where:
- hiringStartDate = productionStartDate - 35 days
- planningStartDate = hiringStartDate - 56 days

**Validates: Requirements 3.4, 3.5**

### Property 8: Milestone Generation Completeness

*For any* created project, the milestone list SHALL contain at least:
- Planning completion milestone
- Hiring completion milestone
- Production start milestone
- 3-episode completion milestone
- 5-episode completion milestone
- 7-episode seal milestone

**Validates: Requirements 5.1, 3.3**

### Property 9: Seal Milestone Date Consistency

*For any* project, the 7-episode seal milestone's target date SHALL equal the project's seal date.

**Validates: Requirements 5.4**

### Property 10: Schedule Validation - Future Start Date

*For any* schedule calculation with a launch date that results in a past production start date, the validation SHALL return an error.

**Validates: Requirements 6.1, 6.2**

### Property 11: Recalculation Consistency

*For any* project, updating the launch date and recalculating SHALL:
- Update all milestone dates proportionally
- Update all episode due dates proportionally
- Preserve the velocity configuration

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

## Error Handling

### Invalid Launch Date

```typescript
class InsufficientTimeError extends Error {
  constructor(
    public launchDate: Date,
    public calculatedStartDate: Date,
    public currentDate: Date
  ) {
    super(`Insufficient time: Production would need to start on ${calculatedStartDate.toISOString()}, but current date is ${currentDate.toISOString()}`);
  }
}
```

### Invalid Episode Number

```typescript
class InvalidEpisodeNumberError extends Error {
  constructor(public episodeNumber: number) {
    super(`Invalid episode number: ${episodeNumber}. Episode number must be a positive integer.`);
  }
}
```

### Project Not Found

```typescript
class ProjectNotFoundError extends Error {
  constructor(public projectId: string) {
    super(`Project not found: ${projectId}`);
  }
}
```

## Testing Strategy

### Unit Tests

Unit tests will verify specific examples and edge cases:

1. **Duration calculation edge cases**:
   - Episode 1 returns 14 days
   - Episode 10 returns 14 days
   - Episode 11 returns 7 days
   - Episode 100 returns 7 days

2. **Date calculation examples**:
   - Launch date 2027-01-31 with 10 episodes → Production start 2026-09-14
   - Seal date calculation for specific dates

3. **Error handling**:
   - Invalid episode number (0, negative)
   - Launch date in the past

### Property-Based Tests

Property-based tests will use **fast-check** library to verify universal properties:

1. **Duration property**: Generate random episode numbers and verify duration rules
2. **Date ordering property**: Generate random launch dates and verify milestone ordering
3. **Round-trip property**: Create projects with random inputs and verify data persistence
4. **Recalculation property**: Update launch dates and verify consistency

Configuration:
- Minimum 100 iterations per property test
- Each test tagged with: **Feature: scheduling-engine, Property {number}: {property_text}**

### Integration Tests

Integration tests will verify the complete flow:

1. Create project → Generate schedule → Query milestones
2. Create project → Update launch date → Verify recalculation
3. Create project with insufficient time → Verify error handling
