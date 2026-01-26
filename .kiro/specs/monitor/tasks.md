# Implementation Plan: Monitor Module

## Overview

WPAIS Monitor 모듈의 구현 계획입니다. 7+3 세이프티 가드 규칙에 따른 비축 상태 감시와 지연 리스크 실시간 모니터링을 구현합니다. 테스트는 Jest와 fast-check를 사용합니다.

## Tasks

- [x] 1. 프로젝트 구조 및 기본 설정
  - monitor 모듈 디렉토리 구조 생성
  - RiskLevel, AlertType, AlertSeverity enum 정의
  - _Requirements: 2.3, 5.1_

- [x] 2. 데이터 모델 구현
  - [x] 2.1 ProgressSnapshot 엔티티 구현
    - id, projectId, snapshotDate, metrics, healthScore 필드 정의
    - TypeORM 데코레이터 적용
    - _Requirements: 8.1_

  - [x] 2.2 Alert 엔티티 구현
    - id, projectId, alertType, severity, message, metadata, createdAt, acknowledgedAt 필드 정의
    - TypeORM 데코레이터 적용
    - _Requirements: 5.4_

  - [x] 2.3 타입 정의
    - BufferStatus, EpisodeRisk, ProjectRisk, ProjectProgress 타입 정의
    - VelocityTrend, SealCountdown, HealthCheckResult 타입 정의
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 6.1, 7.1_

- [x] 3. Checkpoint - 데이터 모델 완료
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. BufferStatusService 구현
  - [x] 4.1 getBufferStatus 메서드 구현
    - 완료된 에피소드 수 계산
    - 봉인 에피소드(1-7)와 비축 에피소드(8-10) 분리
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 4.2 Property test: Buffer status calculation
    - **Property 1: Buffer Status Calculation**
    - **Validates: Requirements 1.1, 1.2, 1.3**

  - [x] 4.3 getEpisodeBufferDetails 메서드 구현
    - 각 에피소드별 봉인/완료 상태 반환
    - _Requirements: 1.4_

- [x] 5. RiskAnalyzer 구현
  - [x] 5.1 analyzeEpisodeRisk 메서드 구현
    - 마감일까지 남은 일수 계산
    - 예상 완료 일수 계산
    - 리스크 레벨 할당
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 5.2 Property test: Risk level assignment
    - **Property 2: Risk Level Assignment**
    - **Validates: Requirements 2.3**

  - [x] 5.3 getProjectRiskLevel 메서드 구현
    - 전체 프로젝트 리스크 레벨 계산
    - 위험 에피소드 목록 반환
    - _Requirements: 2.4_

- [x] 6. Checkpoint - 리스크 분석 완료
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. ProgressService 구현
  - [x] 7.1 getProgress 메서드 구현
    - 전체 진행률 계산 (completedTasks / totalTasks × 100)
    - _Requirements: 3.1_

  - [x] 7.2 Property test: Progress calculation consistency
    - **Property 3: Progress Calculation Consistency**
    - **Validates: Requirements 3.1, 3.4_

  - [x] 7.3 getEpisodeProgress 메서드 구현
    - 에피소드별 진행률 breakdown
    - _Requirements: 3.2_

  - [x] 7.4 getStageProgress 메서드 구현
    - 공정별 진행률 breakdown (Background, Line Art, Coloring, Post-Processing)
    - _Requirements: 3.3_

- [x] 8. VelocityAnalyzer 구현
  - [x] 8.1 calculateActualVelocity 메서드 구현
    - 실제 속도 = 완료 에피소드 / 경과 일수
    - _Requirements: 4.1_

  - [x] 8.2 Property test: Velocity calculation
    - **Property 4: Velocity Calculation**
    - **Validates: Requirements 4.1**

  - [x] 8.3 calculateRequiredVelocity 메서드 구현
    - 필요 속도 = 남은 에피소드 / 봉인일까지 남은 일수
    - _Requirements: 4.2_

  - [x] 8.4 Property test: Required velocity calculation
    - **Property 5: Required Velocity Calculation**
    - **Validates: Requirements 4.2**

  - [x] 8.5 getVelocityTrend 메서드 구현
    - 7일, 14일, 30일 트렌드 분석
    - 추세 방향 판단 (IMPROVING, STABLE, DECLINING)
    - _Requirements: 4.4_

  - [x] 8.6 checkVelocityDeficit 메서드 구현
    - 속도 부족분 계산 및 경고 판단
    - _Requirements: 4.3_

- [x] 9. Checkpoint - 속도 분석 완료
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. AlertService 구현
  - [x] 10.1 Alert 이벤트 타입 정의
    - RiskAlertEvent, SealDeadlineAlertEvent, VelocityAlertEvent 정의
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 10.2 emitAlert 메서드 구현
    - NestJS EventEmitter2 통합
    - 알림 발행 및 DB 저장
    - _Requirements: 5.1, 5.4_

  - [x] 10.3 Property test: Alert emission on risk change
    - **Property 9: Alert Emission on Risk Change**
    - **Validates: Requirements 5.1**

  - [x] 10.4 Property test: Velocity deficit alert
    - **Property 6: Velocity Deficit Alert**
    - **Validates: Requirements 5.3**

  - [x] 10.5 getAlertHistory 메서드 구현
    - 알림 히스토리 조회 및 필터링
    - _Requirements: 5.4_

- [x] 11. SealCountdownService 구현
  - [x] 11.1 getSealCountdown 메서드 구현
    - 봉인일까지 남은 일수 계산
    - 예측 완료일 계산
    - 달성 확률 계산
    - _Requirements: 6.1, 6.2, 6.3_

  - [x] 11.2 Property test: Seal countdown accuracy
    - **Property 8: Seal Countdown Accuracy**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 11.3 predictCompletionDate 메서드 구현
    - 현재 속도 기반 완료일 예측
    - _Requirements: 6.4_

- [x] 12. Checkpoint - 카운트다운 서비스 완료
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. HealthCheckService 구현
  - [x] 13.1 getHealthCheck 메서드 구현
    - 건강 점수 계산 (가중치 적용)
    - 상태 판정 (HEALTHY, ATTENTION, WARNING, CRITICAL)
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 13.2 Property test: Health score bounds
    - **Property 7: Health Score Bounds**
    - **Validates: Requirements 7.1, 7.2**

  - [x] 13.3 generateRecommendations 메서드 구현
    - 문제점 기반 권장 조치 생성
    - _Requirements: 7.4_

- [x] 14. HistoryService 구현
  - [x] 14.1 saveSnapshot 메서드 구현
    - 일별 진행 상황 스냅샷 저장
    - _Requirements: 8.1_

  - [x] 14.2 Property test: Snapshot completeness
    - **Property 10: Snapshot Completeness**
    - **Validates: Requirements 8.1**

  - [x] 14.3 getSnapshots 메서드 구현
    - 날짜 범위 필터링 지원
    - _Requirements: 8.3_

  - [x] 14.4 getTrend 메서드 구현
    - 주간/월간 비교 분석
    - _Requirements: 8.2, 8.4_

- [x] 15. Checkpoint - 히스토리 서비스 완료
  - Ensure all tests pass, ask the user if questions arise.

- [x] 16. MonitorService 통합 구현
  - [x] 16.1 MonitorService 메인 클래스 구현
    - 모든 서브 서비스 통합
    - 통합 API 제공
    - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 8.1_

  - [x] 16.2 MonitorModule 정의
    - 모든 서비스 provider 등록
    - 엔티티 TypeORM 등록
    - EventEmitterModule 통합
    - _Requirements: 1.1_

- [x] 17. 모듈 통합
  - [x] 17.1 SchedulingModule과 연동
    - Episode 완료 시 버퍼 상태 업데이트
    - _Requirements: 1.1_

  - [x] 17.2 WorkflowModule과 연동
    - Task 완료 시 진행률 업데이트
    - _Requirements: 3.1_

- [x] 18. Final checkpoint - 전체 모듈 완료
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- 모든 Property test는 fast-check를 사용하여 100회 이상 실행
- 각 Task는 특정 Requirements를 참조하여 추적 가능
- Checkpoint에서 모든 테스트 통과 확인 필수
- 기존 Scheduling/Workflow 모듈과의 통합 테스트 필수

## Progress Summary

| 구분 | 완료 | 미완료 | 진행률 |
|------|------|--------|--------|
| 데이터 모델 | 3/3 | 0 | 100% |
| 버퍼 상태 | 3/3 | 0 | 100% |
| 리스크 분석 | 3/3 | 0 | 100% |
| 진행률 계산 | 4/4 | 0 | 100% |
| 속도 분석 | 6/6 | 0 | 100% |
| 알림 시스템 | 5/5 | 0 | 100% |
| 카운트다운 | 3/3 | 0 | 100% |
| 건강 점검 | 3/3 | 0 | 100% |
| 히스토리 | 4/4 | 0 | 100% |
| 통합 | 4/4 | 0 | 100% |

**상태**: ✅ 완료
