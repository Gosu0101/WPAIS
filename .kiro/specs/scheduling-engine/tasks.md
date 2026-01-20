# Implementation Plan: Scheduling Engine

## Overview

WPAIS 스케줄링 엔진 모듈의 구현 계획입니다. NestJS와 TypeORM을 사용하여 역산 스케줄링 알고리즘과 적응 가속도 로직을 구현합니다. 테스트는 Jest와 fast-check를 사용합니다.

## Tasks

- [x] 1. 프로젝트 구조 및 기본 설정
  - NestJS 모듈 구조 생성
  - TypeORM 엔티티 기본 설정
  - fast-check 테스트 프레임워크 설정
  - _Requirements: 1.3_

- [ ] 2. 데이터 모델 구현
  - [x] 2.1 Project 엔티티 구현
    - id, title, launchDate, sealDate, productionStartDate, hiringStartDate, planningStartDate, velocityConfig 필드 정의
    - TypeORM 데코레이터 적용
    - _Requirements: 1.3, 1.4_

  - [x] 2.2 Episode 엔티티 구현
    - id, projectId, episodeNumber, dueDate, duration, status, isSealed 필드 정의
    - Project와의 관계 설정 (Many-to-One)
    - _Requirements: 2.4, 4.4_

  - [x] 2.3 Milestone 엔티티 구현
    - id, projectId, name, type, targetDate, isCompleted 필드 정의
    - MilestoneType enum 정의
    - _Requirements: 5.3_

  - [x] 2.4 VelocityConfig 타입 정의
    - learningPeriodEnd, learningPeriodDuration, normalPeriodDuration 필드
    - JSON 직렬화/역직렬화 로직
    - _Requirements: 2.3_

- [x] 3. VelocityConfigService 구현
  - [x] 3.1 getDuration 메서드 구현
    - 회차 번호에 따른 제작 기간 반환 로직
    - 1-10화: 14일, 11화+: 7일
    - _Requirements: 2.1, 2.2_

  - [x] 3.2 Property test: Duration calculation
    - **Property 2: Duration Calculation by Episode Number**
    - **Validates: Requirements 2.1, 2.2**

  - [x] 3.3 isLearningPeriod 메서드 구현
    - 적응기 여부 판단 로직
    - _Requirements: 2.1, 2.2_

- [x] 4. Checkpoint - VelocityConfigService 완료
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. SchedulerService 핵심 로직 구현
  - [x] 5.1 calculateSealDate 메서드 구현
    - 런칭일 - 30일 계산
    - _Requirements: 1.1, 3.1_

  - [x] 5.2 Property test: Seal date calculation
    - **Property 1: Seal Date Calculation**
    - **Validates: Requirements 1.1, 3.1**

  - [x] 5.3 calculateTotalProductionDuration 메서드 구현
    - 전체 제작 기간 합산 (적응기 + 정상기)
    - _Requirements: 1.4, 3.2_

  - [x] 5.4 calculateProductionStartDate 메서드 구현
    - 봉인일 - 총 제작 기간
    - _Requirements: 1.2, 3.2_

  - [x] 5.5 Property test: Production start date calculation
    - **Property 4: Production Start Date Calculation**
    - **Validates: Requirements 1.2, 3.2**

  - [x] 5.6 calculateHiringStartDate 메서드 구현
    - 제작 시작일 - 35일 (5주)
    - _Requirements: 3.4_

  - [x] 5.7 calculatePlanningStartDate 메서드 구현
    - 채용 시작일 - 56일 (8주)
    - _Requirements: 3.5_

  - [x] 5.8 Property test: Milestone date relationships
    - **Property 7: Milestone Date Relationships**
    - **Validates: Requirements 3.4, 3.5**

- [x] 6. Checkpoint - 날짜 계산 로직 완료
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. 회차별 마감일 계산 구현
  - [x] 7.1 generateEpisodeSchedules 메서드 구현
    - 회차별 시작일, 마감일, 기간 계산
    - 적응기/정상기 구분 적용
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 7.2 Property test: Episode due date ordering
    - **Property 5: Episode Due Date Ordering**
    - **Validates: Requirements 4.1**

  - [x] 7.3 Property test: Episode spacing consistency
    - **Property 6: Episode Spacing Consistency**
    - **Validates: Requirements 4.2, 4.3**

- [ ] 8. 마일스톤 생성 구현
  - [ ] 8.1 generateMilestones 메서드 구현
    - 기획 완료, 채용 완료, 제작 시작 마일스톤
    - 3화/5화/7화 완성 마일스톤
    - _Requirements: 5.1, 5.2, 3.3_

  - [ ] 8.2 Property test: Milestone generation completeness
    - **Property 8: Milestone Generation Completeness**
    - **Validates: Requirements 5.1, 3.3**

  - [ ] 8.3 Property test: Seal milestone date consistency
    - **Property 9: Seal Milestone Date Consistency**
    - **Validates: Requirements 5.4**

- [ ] 9. Checkpoint - 스케줄 생성 로직 완료
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. calculateMasterSchedule 통합 구현
  - [ ] 10.1 calculateMasterSchedule 메서드 구현
    - 모든 계산 로직 통합
    - MasterSchedule 객체 반환
    - _Requirements: 1.2, 1.4, 3.2, 3.3_

- [ ] 11. 일정 유효성 검증 구현
  - [ ] 11.1 validateSchedule 메서드 구현
    - 제작 시작일이 미래인지 검증
    - 마일스톤 날짜 충돌 검사
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ] 11.2 Property test: Schedule validation
    - **Property 10: Schedule Validation - Future Start Date**
    - **Validates: Requirements 6.1, 6.2**

  - [ ] 11.3 에러 클래스 구현
    - InsufficientTimeError
    - InvalidEpisodeNumberError
    - _Requirements: 6.2_

- [ ] 12. 일정 재계산 구현
  - [ ] 12.1 recalculateSchedule 메서드 구현
    - 런칭일 변경 시 전체 일정 재계산
    - velocityConfig 보존
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 12.2 Property test: Recalculation consistency
    - **Property 11: Recalculation Consistency**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4**

- [ ] 13. Checkpoint - SchedulerService 완료
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 14. ProjectManager 구현
  - [ ] 14.1 createProject 메서드 구현
    - 프로젝트 생성 및 스케줄 계산
    - DB 저장
    - _Requirements: 1.1, 1.2, 1.3_

  - [ ] 14.2 Property test: Project data round-trip
    - **Property 3: Project Data Round-Trip**
    - **Validates: Requirements 1.3, 4.4**

  - [ ] 14.3 getMilestones 메서드 구현
    - 프로젝트 마일스톤 조회
    - _Requirements: 5.3_

  - [ ] 14.4 updateLaunchDate 메서드 구현
    - 런칭일 업데이트 및 재계산 트리거
    - _Requirements: 7.1, 7.2_

- [ ] 15. Final checkpoint - 전체 모듈 완료
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- All tasks including property tests are required for comprehensive coverage
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties using fast-check
- Unit tests validate specific examples and edge cases
