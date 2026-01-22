# Implementation Plan: Workflow Engine

## Overview

WPAIS 워크플로우 엔진 모듈의 구현 계획입니다. Page 엔티티와 스테이지 퍼스트 의존성 기반의 공정 릴레이 로직을 구현합니다. 테스트는 Jest와 fast-check를 사용합니다.

## Tasks

- [ ] 1. 프로젝트 구조 및 기본 설정
  - workflow 모듈 디렉토리 구조 생성
  - TaskType, TaskStatus enum 정의
  - _Requirements: 2.1, 2.2_

- [ ] 2. Page 엔티티 구현
  - [ ] 2.1 Page 엔티티 정의
    - id, episodeId, pageNumber, heightPx 필드
    - backgroundStatus, lineArtStatus, coloringStatus, postProcessingStatus 필드
    - Episode와의 관계 설정 (Many-to-One)
    - TypeORM 데코레이터 적용
    - _Requirements: 1.1, 1.4_

  - [ ] 2.2 Property test: Page initialization
    - **Property 1: Page Initialization Invariant**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 3. Checkpoint - Page 엔티티 완료
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. 상태 전이 검증 구현
  - [ ] 4.1 validateTransition 메서드 구현
    - LOCKED→READY, READY→IN_PROGRESS, IN_PROGRESS→DONE 허용
    - 그 외 전이는 InvalidStateTransitionError 발생
    - _Requirements: 2.3, 2.4, 2.5, 6.1, 6.2_

  - [ ] 4.2 Property test: Valid state transitions
    - **Property 4: Valid State Transitions Only**
    - **Validates: Requirements 2.3, 2.4, 2.5, 6.1, 6.2**

- [ ] 5. 스테이지 퍼스트 의존성 구현
  - [ ] 5.1 validateDependency 메서드 구현
    - LINE_ART 시작 전 BACKGROUND가 DONE인지 검증
    - COLORING 시작 전 LINE_ART가 DONE인지 검증
    - POST_PROCESSING 시작 전 COLORING이 DONE인지 검증
    - 의존성 미충족 시 LockedException 발생
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ] 5.2 Property test: Stage-first dependency
    - **Property 2: Stage-First Dependency Enforcement**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

  - [ ] 5.3 LockedException 에러 클래스 구현
    - pageId, taskType, requiredPredecessor 포함
    - _Requirements: 3.1_

- [ ] 6. Checkpoint - 의존성 검증 완료
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. 자동 잠금 해제 구현
  - [ ] 7.1 unlockNextTask 메서드 구현
    - BACKGROUND DONE → LINE_ART를 READY로 변경
    - LINE_ART DONE → COLORING을 READY로 변경
    - COLORING DONE → POST_PROCESSING을 READY로 변경
    - _Requirements: 4.1, 4.2, 4.3_

  - [ ] 7.2 Property test: Auto-unlock chain
    - **Property 3: Auto-Unlock Chain**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [ ] 8. 작업 상태 변경 메서드 구현
  - [ ] 8.1 startTask 메서드 구현
    - READY → IN_PROGRESS 전이
    - 의존성 검증 포함
    - _Requirements: 2.4, 3.1, 3.2, 3.3_

  - [ ] 8.2 completeTask 메서드 구현
    - IN_PROGRESS → DONE 전이
    - 자동 잠금 해제 트리거
    - _Requirements: 2.5, 4.1, 4.2, 4.3_

- [ ] 9. Checkpoint - 핵심 워크플로우 완료
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. 이벤트 시스템 구현
  - [ ] 10.1 TaskUnlockedEvent 정의
    - pageId, taskType, timestamp 필드
    - _Requirements: 7.1, 7.2_

  - [ ] 10.2 이벤트 발행 로직 구현
    - unlockNextTask 시 TaskUnlockedEvent 발행
    - _Requirements: 7.1, 4.4_

  - [ ] 10.3 Property test: Event emission
    - **Property 6: Task Unlock Event Emission**
    - **Validates: Requirements 7.1, 7.2**

- [ ] 11. 에피소드 진행률 계산 구현
  - [ ] 11.1 calculateEpisodeProgress 메서드 구현
    - 완료된 Task 수 / 전체 Task 수 (20개) × 100
    - TaskType별 진행률 breakdown
    - _Requirements: 5.1, 5.3_

  - [ ] 11.2 에피소드 완료 처리 구현
    - 20개 Task 모두 DONE 시 Episode COMPLETED 처리
    - EpisodeCompletedEvent 발행
    - _Requirements: 5.2_

  - [ ] 11.3 Property test: Progress calculation
    - **Property 5: Episode Progress Calculation**
    - **Validates: Requirements 5.1, 5.2**

- [ ] 12. 페이지 초기화 구현
  - [ ] 12.1 initializePages 메서드 구현
    - Episode 생성 시 5개 Page 자동 생성
    - 순차적 pageNumber (1-5) 할당
    - 초기 상태 설정 (BACKGROUND: READY, 나머지: LOCKED)
    - _Requirements: 1.1, 1.3_

- [ ] 13. Checkpoint - WorkflowEngine 완료
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. 모듈 통합
  - [ ] 14.1 WorkflowModule 정의
    - WorkflowEngineService provider 등록
    - Page 엔티티 TypeORM 등록
    - _Requirements: 1.1_

  - [ ] 14.2 SchedulingModule과 연동
    - Episode 생성 시 Page 자동 초기화 연결
    - _Requirements: 1.1_

- [ ] 15. Final checkpoint - 전체 모듈 완료
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 모든 Property test는 fast-check를 사용하여 100회 이상 실행
- 각 Task는 특정 Requirements를 참조하여 추적 가능
- Checkpoint에서 모든 테스트 통과 확인 필수
- 스테이지 퍼스트 의존성은 핵심 비즈니스 로직이므로 철저히 테스트
