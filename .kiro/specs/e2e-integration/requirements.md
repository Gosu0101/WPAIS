# Requirements Document: E2E Integration Tests

## Introduction

WPAIS 시스템의 전체 모듈 간 통합 테스트 요구사항입니다. Scheduling, Workflow, Monitor 모듈이 올바르게 연동되어 웹툰 제작 전체 라이프사이클을 지원하는지 검증합니다.

## Glossary

- **E2E Test**: 시스템 전체 흐름을 검증하는 End-to-End 테스트
- **Integration Test**: 모듈 간 연동을 검증하는 통합 테스트
- **Happy Path**: 정상적인 시나리오 흐름
- **Edge Case**: 경계 조건 및 예외 상황

## Requirements

### Requirement 1: 프로젝트 생성 → 스케줄 생성 플로우

**User Story:** As a PD, I want to create a project and have all schedules automatically generated, so that I can start production planning immediately.

#### Acceptance Criteria

1. WHEN a project is created with launchDate and episodeCount, THE System SHALL generate all episode schedules
2. THE System SHALL calculate correct sealDate (launchDate - 30 days)
3. THE System SHALL generate all milestones (planning, hiring, production start, 3/5/7 episode completion)
4. THE System SHALL initialize 5 pages per episode with correct initial states

### Requirement 2: 워크플로우 전체 사이클

**User Story:** As an artist, I want to complete all tasks for a page following the dependency chain, so that the page is fully produced.

#### Acceptance Criteria

1. WHEN BACKGROUND task is started and completed, THE System SHALL unlock LINE_ART
2. WHEN LINE_ART task is started and completed, THE System SHALL unlock COLORING
3. WHEN COLORING task is started and completed, THE System SHALL unlock POST_PROCESSING
4. WHEN POST_PROCESSING task is completed, THE Page SHALL be fully complete
5. THE System SHALL emit appropriate events at each state transition

### Requirement 3: 에피소드 완료 플로우

**User Story:** As a PD, I want to track episode completion when all pages are done, so that I can monitor production progress.

#### Acceptance Criteria

1. WHEN all 5 pages of an episode have all 4 tasks DONE, THE Episode SHALL be marked as COMPLETED
2. THE System SHALL emit EpisodeCompletedEvent
3. THE System SHALL update buffer status when episode is completed
4. THE System SHALL update project progress percentage

### Requirement 4: 모니터링 데이터 정합성

**User Story:** As a PD, I want monitoring data to accurately reflect the current production state, so that I can make informed decisions.

#### Acceptance Criteria

1. THE Buffer status SHALL accurately reflect completed vs sealed episodes
2. THE Progress percentage SHALL match (completedTasks / totalTasks) × 100
3. THE Risk level SHALL be calculated based on remaining time and velocity
4. THE Health score SHALL be within 0-100 bounds

### Requirement 5: 런칭일 변경 시 전체 재계산

**User Story:** As a PD, I want all schedules to be recalculated when launch date changes, so that the project timeline stays consistent.

#### Acceptance Criteria

1. WHEN launchDate is updated, THE System SHALL recalculate sealDate
2. THE System SHALL recalculate all episode due dates
3. THE System SHALL recalculate all milestone dates
4. THE System SHALL preserve velocityConfig settings

### Requirement 6: 에러 처리 및 복구

**User Story:** As a system administrator, I want proper error handling across modules, so that the system remains stable.

#### Acceptance Criteria

1. WHEN invalid state transition is attempted, THE System SHALL throw InvalidStateTransitionError
2. WHEN dependency is not met, THE System SHALL throw LockedException
3. WHEN insufficient time is detected, THE System SHALL throw InsufficientTimeError
4. THE System SHALL maintain data consistency after errors

### Requirement 7: 이벤트 전파

**User Story:** As a system component, I want to receive events from other modules, so that I can react to state changes.

#### Acceptance Criteria

1. WHEN task is unlocked, THE System SHALL emit TaskUnlockedEvent
2. WHEN episode is completed, THE System SHALL emit EpisodeCompletedEvent
3. WHEN risk level changes, THE System SHALL emit appropriate alerts
4. THE Monitor module SHALL receive and process workflow events

