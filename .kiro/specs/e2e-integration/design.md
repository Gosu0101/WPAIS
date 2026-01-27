# Design Document: E2E Integration Tests

## Overview

WPAIS 시스템의 전체 모듈 간 통합 테스트 설계입니다. Scheduling → Workflow → Monitor 모듈의 연동을 검증하고, 웹툰 제작 전체 라이프사이클이 올바르게 동작하는지 확인합니다.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         E2E Test Suite                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐  │
│  │   Scheduling     │───▶│    Workflow      │───▶│    Monitor       │  │
│  │   Module         │    │    Module        │    │    Module        │  │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘  │
│         │                        │                        │             │
│         ▼                        ▼                        ▼             │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    In-Memory Database                             │  │
│  │                    (SQLite / TypeORM)                             │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    Event Bus (EventEmitter2)                      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Test Categories

### 1. Happy Path Tests

전체 워크플로우가 정상적으로 동작하는 시나리오 검증

```typescript
describe('Happy Path: Project Lifecycle', () => {
  // 프로젝트 생성 → 스케줄 생성 → 작업 진행 → 에피소드 완료 → 모니터링
});
```

### 2. Module Integration Tests

모듈 간 데이터 흐름 및 이벤트 전파 검증

```typescript
describe('Module Integration', () => {
  // Scheduling → Workflow 연동
  // Workflow → Monitor 연동
  // 이벤트 전파 검증
});
```

### 3. Error Handling Tests

에러 상황에서의 시스템 안정성 검증

```typescript
describe('Error Handling', () => {
  // 잘못된 상태 전이
  // 의존성 미충족
  // 시간 부족
});
```

### 4. Data Consistency Tests

데이터 정합성 검증

```typescript
describe('Data Consistency', () => {
  // 진행률 계산 정확성
  // 버퍼 상태 정확성
  // 마일스톤 날짜 정합성
});
```

## Test Setup

### Test Module Configuration

```typescript
// test/e2e/test-app.module.ts
@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: ':memory:',
      entities: [Project, Episode, Milestone, Page, Alert, ProgressSnapshot],
      synchronize: true,
    }),
    EventEmitterModule.forRoot(),
    SchedulingModule,
    WorkflowModule,
    MonitorModule,
  ],
})
export class TestAppModule {}
```

### Test Utilities

```typescript
// test/e2e/utils/test-helpers.ts
export async function createTestProject(
  projectManager: ProjectManagerService,
  overrides?: Partial<CreateProjectInput>
): Promise<Project>;

export async function completeAllTasksForPage(
  workflowEngine: WorkflowEngineService,
  page: Page
): Promise<Page>;

export async function completeEpisode(
  workflowEngine: WorkflowEngineService,
  pages: Page[]
): Promise<void>;
```

## Test Scenarios

### Scenario 1: Full Project Lifecycle

```
1. 프로젝트 생성 (launchDate: 6개월 후, episodeCount: 52)
2. 스케줄 검증 (sealDate, productionStartDate, milestones)
3. 첫 번째 에피소드 작업 시작
4. 모든 페이지 작업 완료
5. 에피소드 완료 확인
6. 모니터링 데이터 검증
```

### Scenario 2: Workflow State Machine

```
1. 페이지 초기 상태 확인 (BACKGROUND: READY, 나머지: LOCKED)
2. BACKGROUND 시작 → IN_PROGRESS
3. BACKGROUND 완료 → DONE, LINE_ART → READY
4. LINE_ART 시작 → IN_PROGRESS
5. LINE_ART 완료 → DONE, COLORING → READY
6. COLORING 시작/완료
7. POST_PROCESSING 시작/완료
8. 페이지 완료 확인
```

### Scenario 3: Launch Date Change

```
1. 프로젝트 생성
2. 런칭일 변경 (2주 앞당김)
3. 모든 날짜 재계산 확인
4. 마일스톤 날짜 검증
5. 에피소드 마감일 검증
```

### Scenario 4: Error Recovery

```
1. 잘못된 상태 전이 시도 → 에러 확인
2. 의존성 미충족 작업 시작 시도 → 에러 확인
3. 에러 후 데이터 정합성 확인
```

## Correctness Properties

### Property 1: Project Creation Completeness

*For any* valid project creation input:
- THE System SHALL generate exactly episodeCount episodes
- THE System SHALL generate 5 pages per episode
- THE System SHALL generate all required milestones

**Validates: Requirements 1.1, 1.2, 1.3, 1.4**

### Property 2: Workflow State Consistency

*For any* page at any point in time:
- IF BACKGROUND is not DONE, THEN LINE_ART SHALL be LOCKED
- IF LINE_ART is not DONE, THEN COLORING SHALL be LOCKED
- IF COLORING is not DONE, THEN POST_PROCESSING SHALL be LOCKED

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

### Property 3: Episode Completion Consistency

*For any* episode:
- Episode is COMPLETED IFF all 20 tasks (5 pages × 4 tasks) are DONE
- Progress percentage SHALL equal (completedTasks / 20) × 100

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 4: Monitor Data Accuracy

*For any* project state:
- Buffer status SHALL accurately reflect sealed vs completed episodes
- Health score SHALL be within [0, 100]
- Risk level SHALL be one of: LOW, MEDIUM, HIGH, CRITICAL

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 5: Schedule Recalculation Consistency

*For any* launch date change:
- sealDate SHALL equal newLaunchDate - 30 days
- All episode due dates SHALL be recalculated
- All milestone dates SHALL be recalculated
- velocityConfig SHALL be preserved

**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 6: Event Emission Completeness

*For any* state change:
- Task unlock SHALL emit TaskUnlockedEvent
- Episode completion SHALL emit EpisodeCompletedEvent
- Risk level change SHALL emit appropriate alert

**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

## Testing Strategy

### Unit Tests (Already Complete)
- 각 모듈의 개별 기능 테스트
- Property-based tests with fast-check

### Integration Tests (This Spec)
- 모듈 간 연동 테스트
- 데이터 흐름 검증
- 이벤트 전파 검증

### E2E Tests (This Spec)
- 전체 시나리오 테스트
- API 엔드포인트 테스트
- 실제 사용 시나리오 시뮬레이션

## File Structure

```
test/
├── e2e/
│   ├── app.e2e-spec.ts           # 전체 앱 E2E 테스트
│   ├── project-lifecycle.e2e-spec.ts
│   ├── workflow-integration.e2e-spec.ts
│   ├── monitor-integration.e2e-spec.ts
│   └── utils/
│       ├── test-app.module.ts
│       ├── test-helpers.ts
│       └── test-factories.ts
└── integration/
    ├── scheduling-workflow.integration-spec.ts
    ├── workflow-monitor.integration-spec.ts
    └── full-cycle.integration-spec.ts
```

