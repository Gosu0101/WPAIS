# Implementation Plan: E2E Integration Tests

## Overview

WPAIS 시스템의 전체 모듈 간 통합 테스트 구현 계획입니다. Jest와 NestJS Testing 모듈을 사용하여 Scheduling, Workflow, Monitor 모듈의 연동을 검증합니다.

## Tasks

- [x] 1. 테스트 환경 설정
  - [x] 1.1 테스트 유틸리티 디렉토리 구조 생성
    - test/e2e, test/integration, test/utils 폴더 생성
    - _Requirements: N/A (Setup)_

  - [x] 1.2 TestAppModule 구현
    - In-memory SQLite 설정
    - 모든 모듈 통합
    - EventEmitterModule 설정
    - _Requirements: N/A (Setup)_

  - [x] 1.3 테스트 헬퍼 함수 구현
    - createTestProject, completeAllTasksForPage, completeEpisode 헬퍼
    - 테스트 데이터 팩토리
    - _Requirements: N/A (Setup)_

- [x] 2. Checkpoint - 테스트 환경 완료
  - Ensure test setup works correctly.

- [x] 3. Scheduling-Workflow 통합 테스트
  - [x] 3.1 프로젝트 생성 시 페이지 초기화 테스트
    - 프로젝트 생성 → 에피소드 생성 → 페이지 초기화 검증
    - 페이지 초기 상태 검증 (BACKGROUND: READY, 나머지: LOCKED)
    - _Requirements: 1.1, 1.4_

  - [x] 3.2 Property test: Project creation completeness
    - **Property 1: Project Creation Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3, 1.4**

- [x] 4. Workflow 전체 사이클 테스트
  - [x] 4.1 단일 페이지 워크플로우 완료 테스트
    - BACKGROUND → LINE_ART → COLORING → POST_PROCESSING 순차 완료
    - 각 단계별 상태 전이 검증
    - 이벤트 발행 검증
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.2 Property test: Workflow state consistency
    - **Property 2: Workflow State Consistency**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.4**

  - [x] 4.3 에피소드 완료 테스트
    - 5개 페이지 모두 완료 시 에피소드 완료 검증
    - EpisodeCompletedEvent 발행 검증
    - _Requirements: 3.1, 3.2_

  - [x] 4.4 Property test: Episode completion consistency
    - **Property 3: Episode Completion Consistency**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 5. Checkpoint - Workflow 통합 테스트 완료
  - Ensure all workflow integration tests pass.

- [x] 6. Workflow-Monitor 통합 테스트
  - [x] 6.1 진행률 계산 정확성 테스트
    - 작업 완료 시 진행률 업데이트 검증
    - 에피소드별/공정별 진행률 breakdown 검증
    - _Requirements: 4.1, 4.2_

  - [x] 6.2 버퍼 상태 업데이트 테스트
    - 에피소드 완료 시 버퍼 상태 변경 검증
    - 봉인/비축 에피소드 구분 검증
    - _Requirements: 4.1_

  - [x] 6.3 Property test: Monitor data accuracy
    - **Property 4: Monitor Data Accuracy**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**

- [x] 7. 런칭일 변경 통합 테스트
  - [x] 7.1 스케줄 재계산 테스트
    - 런칭일 변경 → 전체 일정 재계산 검증
    - sealDate, productionStartDate, hiringStartDate, planningStartDate 검증
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 7.2 마일스톤 재계산 테스트
    - 런칭일 변경 → 마일스톤 날짜 재계산 검증
    - _Requirements: 5.3_

  - [x] 7.3 Property test: Schedule recalculation consistency
    - **Property 5: Schedule Recalculation Consistency**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4**

- [x] 8. Checkpoint - 재계산 테스트 완료
  - Ensure all recalculation tests pass.

- [x] 9. 에러 처리 통합 테스트
  - [x] 9.1 잘못된 상태 전이 테스트
    - LOCKED → IN_PROGRESS 시도 → InvalidStateTransitionError
    - DONE → IN_PROGRESS 시도 → InvalidStateTransitionError
    - _Requirements: 6.1_

  - [x] 9.2 의존성 미충족 테스트
    - BACKGROUND 미완료 상태에서 LINE_ART 시작 → LockedException
    - _Requirements: 6.2_

  - [x] 9.3 데이터 정합성 유지 테스트
    - 에러 발생 후 데이터 상태 검증
    - 롤백 없이 원래 상태 유지 확인
    - _Requirements: 6.4_

- [x] 10. 이벤트 전파 통합 테스트
  - [x] 10.1 TaskUnlockedEvent 전파 테스트
    - 작업 완료 → 다음 작업 잠금 해제 → 이벤트 발행 검증
    - _Requirements: 7.1_

  - [x] 10.2 EpisodeCompletedEvent 전파 테스트
    - 에피소드 완료 → 이벤트 발행 → Monitor 수신 검증
    - _Requirements: 7.2_

  - [x] 10.3 Property test: Event emission completeness
    - **Property 6: Event Emission Completeness**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [x] 11. Checkpoint - 이벤트 테스트 완료
  - Ensure all event propagation tests pass.

- [x] 12. E2E 시나리오 테스트
  - [x] 12.1 전체 프로젝트 라이프사이클 테스트
    - 프로젝트 생성 → 작업 진행 → 에피소드 완료 → 모니터링 검증
    - 실제 사용 시나리오 시뮬레이션
    - _Requirements: 1.1, 2.1, 3.1, 4.1_

  - [x] 12.2 다중 에피소드 병렬 작업 테스트
    - 여러 에피소드 동시 작업 시나리오
    - 데이터 정합성 검증
    - _Requirements: 3.4, 4.2_

- [x] 13. API E2E 테스트
  - [x] 13.1 Project API E2E 테스트
    - POST /api/projects → GET /api/projects/:id 플로우
    - PATCH /api/projects/:id 재계산 검증
    - _Requirements: 1.1, 5.1_

  - [x] 13.2 Workflow API E2E 테스트
    - POST /api/pages/:id/tasks/:type/start → complete 플로우
    - 상태 전이 및 에러 응답 검증
    - _Requirements: 2.1, 6.1, 6.2_

  - [x] 13.3 Monitor API E2E 테스트
    - GET /api/projects/:id/dashboard 데이터 정확성
    - 실시간 데이터 반영 검증
    - _Requirements: 4.1_

- [x] 14. Final checkpoint - 전체 통합 테스트 완료
  - Ensure all integration and E2E tests pass.
  - Generate test coverage report.

## Notes

- 모든 통합 테스트는 In-memory SQLite 사용
- Property test는 fast-check 사용 (100회 이상 실행)
- E2E 테스트는 supertest 사용
- 테스트 간 데이터 격리 필수 (beforeEach에서 DB 초기화)

## Progress Summary

| 구분 | 완료 | 미완료 | 진행률 |
|------|------|--------|--------|
| 테스트 환경 | 0/3 | 3 | 0% |
| Scheduling-Workflow | 0/2 | 2 | 0% |
| Workflow 사이클 | 0/4 | 4 | 0% |
| Workflow-Monitor | 0/3 | 3 | 0% |
| 런칭일 변경 | 0/3 | 3 | 0% |
| 에러 처리 | 0/3 | 3 | 0% |
| 이벤트 전파 | 0/3 | 3 | 0% |
| E2E 시나리오 | 0/2 | 2 | 0% |
| API E2E | 0/3 | 3 | 0% |

**다음 작업**: Task 1.1 테스트 유틸리티 디렉토리 구조 생성

