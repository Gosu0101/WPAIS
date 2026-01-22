# Requirements Document

## Introduction

WPAIS 워크플로우 엔진 모듈의 요구사항입니다. 웹툰 제작의 페이지 단위 작업 관리와 '스테이지 퍼스트' 의존성 기반의 공정 릴레이 로직을 정의합니다. 배경 작업이 완료되어야만 선화 작업이 시작될 수 있는 강한 의존성을 시스템적으로 강제합니다.

## Glossary

- **Page**: 웹툰 제작의 최소 작업 단위 (20,000px 규격)
- **Episode**: 5개의 Page로 구성된 회차
- **Task**: Page 내 특정 공정(배경, 선화, 채색, 후보정)의 작업 단위
- **WorkflowEngine**: 공정 간 의존성과 상태 전이를 관리하는 서비스
- **Stage_First**: 배경이 완료되어야 선화가 시작되는 의존성 규칙
- **TaskStatus**: 작업 상태 (LOCKED, READY, IN_PROGRESS, DONE)
- **TaskType**: 공정 유형 (BACKGROUND, LINE_ART, COLORING, POST_PROCESSING)

## Requirements

### Requirement 1: Page 엔티티 관리

**User Story:** As a PD, I want to manage pages as the smallest work unit, so that I can track production progress at a granular level.

#### Acceptance Criteria

1. WHEN an Episode is created, THE System SHALL automatically generate 5 Page entities with sequential page numbers (1-5)
2. THE Page SHALL have a fixed specification of 20,000px height
3. WHEN a Page is created, THE System SHALL initialize all task statuses with BACKGROUND as READY and others as LOCKED
4. THE Page SHALL maintain a reference to its parent Episode via episodeId

### Requirement 2: Task 상태 관리

**User Story:** As a PD, I want to track task status for each production stage, so that I can monitor workflow progress.

#### Acceptance Criteria

1. THE Task SHALL have one of four types: BACKGROUND, LINE_ART, COLORING, POST_PROCESSING
2. THE Task SHALL have one of four statuses: LOCKED, READY, IN_PROGRESS, DONE
3. WHEN a Task status is LOCKED, THE System SHALL prevent any status changes except to READY by the workflow engine
4. WHEN a Task status is READY, THE System SHALL allow transition to IN_PROGRESS
5. WHEN a Task status is IN_PROGRESS, THE System SHALL allow transition to DONE

### Requirement 3: 스테이지 퍼스트 의존성

**User Story:** As a PD, I want the system to enforce stage-first dependency, so that line art cannot start before background is complete.

#### Acceptance Criteria

1. WHEN attempting to change LINE_ART status to IN_PROGRESS, IF BACKGROUND status is not DONE, THEN THE System SHALL throw a LockedException
2. WHEN attempting to change COLORING status to IN_PROGRESS, IF LINE_ART status is not DONE, THEN THE System SHALL throw a LockedException
3. WHEN attempting to change POST_PROCESSING status to IN_PROGRESS, IF COLORING status is not DONE, THEN THE System SHALL throw a LockedException
4. THE System SHALL enforce this dependency chain: BACKGROUND → LINE_ART → COLORING → POST_PROCESSING

### Requirement 4: 자동 잠금 해제 (Auto-Unlock)

**User Story:** As a workflow manager, I want the system to automatically unlock the next stage when the current stage is complete, so that artists can start work immediately.

#### Acceptance Criteria

1. WHEN BACKGROUND status changes to DONE, THE System SHALL automatically change LINE_ART status from LOCKED to READY
2. WHEN LINE_ART status changes to DONE, THE System SHALL automatically change COLORING status from LOCKED to READY
3. WHEN COLORING status changes to DONE, THE System SHALL automatically change POST_PROCESSING status from LOCKED to READY
4. WHEN a task is unlocked, THE System SHALL trigger a notification event

### Requirement 5: 에피소드 진행률 계산

**User Story:** As a PD, I want to see episode completion percentage, so that I can track overall progress.

#### Acceptance Criteria

1. THE System SHALL calculate episode progress as (completed tasks / total tasks) * 100
2. WHEN all 20 tasks (5 pages × 4 stages) are DONE, THE System SHALL mark the Episode as COMPLETED
3. THE System SHALL provide progress breakdown by task type (e.g., "Background: 80%, Line Art: 60%")

### Requirement 6: 작업 상태 변경 검증

**User Story:** As a system administrator, I want invalid state transitions to be rejected, so that data integrity is maintained.

#### Acceptance Criteria

1. IF a Task status transition is invalid (e.g., LOCKED → DONE), THEN THE System SHALL throw an InvalidStateTransitionError
2. THE System SHALL only allow valid transitions: LOCKED→READY, READY→IN_PROGRESS, IN_PROGRESS→DONE
3. WHEN an invalid transition is attempted, THE System SHALL log the attempt with details

### Requirement 7: 페이지 릴레이 이벤트

**User Story:** As an artist, I want to be notified when my task becomes available, so that I can start work promptly.

#### Acceptance Criteria

1. WHEN a task status changes to READY, THE System SHALL emit a TaskUnlockedEvent
2. THE TaskUnlockedEvent SHALL contain pageId, taskType, and timestamp
3. THE System SHALL support subscribing to task unlock events by taskType
