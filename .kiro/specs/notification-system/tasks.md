# Implementation Plan: 알림 시스템 (Notification System)

## Overview

WPAIS 알림 시스템 구현 계획입니다. 마감 임박 알림, 작업자별 알림, 역할 기반 알림 수신 기능을 구현합니다.

## Tasks

- [x] 1. 기본 설정 및 엔티티 구현
  - [x] 1.1 @nestjs/schedule 패키지 설치
    - npm install @nestjs/schedule
    - AppModule에 ScheduleModule.forRoot() 추가
    - _Requirements: 6.1_

  - [x] 1.2 Notification 엔티티 구현
    - src/notification/entities/notification.entity.ts 생성
    - id, projectId, recipientId, notificationType, severity, title, message, metadata, isRead, readAt, createdAt 필드
    - _Requirements: 5.1, 5.2_

  - [x] 1.3 ProjectMember 엔티티 구현
    - src/notification/entities/project-member.entity.ts 생성
    - id, projectId, userId, role(PD/WORKER), taskType 필드
    - _Requirements: 3.1, 3.2_

  - [x] 1.4 NotificationSetting 엔티티 구현
    - src/notification/entities/notification-setting.entity.ts 생성
    - enabledTypes, thresholds 설정 필드
    - _Requirements: 4.1, 4.2_

  - [x] 1.5 NotificationType enum 및 타입 정의
    - src/notification/types/notification.types.ts 생성
    - NotificationType, MemberRole enum 정의
    - _Requirements: N/A (Setup)_

- [x] 2. Checkpoint - 엔티티 완료
  - 마이그레이션 생성 및 실행 확인

- [x] 3. 수신자 결정 서비스 구현
  - [x] 3.1 RecipientResolverService 구현
    - getProjectPDs(): 프로젝트 PD 목록 조회
    - getTaskWorker(): 공정별 담당자 조회
    - resolveRecipients(): 알림 유형별 수신자 결정
    - _Requirements: 3.1, 3.2_

  - [x] 3.2 Property test: PD는 모든 알림 수신
    - **Property 1: PD Always Receives Notifications**
    - **Validates: Requirements 2.3, 3.1**

- [x] 4. 알림 서비스 구현
  - [x] 4.1 NotificationService 기본 구현
    - createNotification(): 알림 생성
    - getNotifications(): 알림 목록 조회 (필터링, 페이지네이션)
    - markAsRead(): 알림 확인 처리
    - markAllAsRead(): 전체 확인 처리
    - getUnreadCount(): 미확인 알림 수 조회
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 4.2 작업 완료 알림 구현
    - notifyTaskCompleted(): 작업 완료 시 알림 생성
    - PD에게 TASK_COMPLETED 알림
    - 다음 담당자에게 NEXT_TASK_READY 알림
    - _Requirements: 2.2, 2.3_

  - [x] 4.3 Property test: 작업 완료 시 다음 담당자 알림
    - **Property 2: Next Worker Notification on Task Complete**
    - **Validates: Requirements 2.2**

  - [x] 4.4 작업 시작/에피소드 완료 알림 구현
    - notifyTaskStarted(): 작업 시작 알림 (PD에게)
    - notifyEpisodeCompleted(): 에피소드 완료 알림 (PD에게)
    - _Requirements: 2.1, 2.4_

- [x] 5. Checkpoint - 알림 서비스 완료
  - 단위 테스트 통과 확인

- [x] 6. 스케줄러 서비스 구현
  - [x] 6.1 NotificationSchedulerService 구현
    - @Cron('0 9 * * *') 매일 오전 9시 실행
    - checkTaskDeadlines(): 공정 마감 체크
    - checkEpisodeDeadlines(): 에피소드 마감 체크
    - checkMilestoneDeadlines(): 마일스톤 마감 체크
    - _Requirements: 1.1, 1.2, 1.3, 6.1_

  - [x] 6.2 중복 알림 방지 로직 구현
    - 같은 항목/임계값 조합에 대해 1회만 알림
    - metadata에 itemId, daysRemaining 저장하여 중복 체크
    - _Requirements: 6.1_

  - [x] 6.3 Property test: 마감 알림 중복 방지
    - **Property 3: No Duplicate Deadline Notifications**
    - **Validates: Requirements 6.1**

  - [x] 6.4 Property test: 완료된 항목 알림 없음
    - **Property 4: No Notifications for Completed Items**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 7. Checkpoint - 스케줄러 완료
  - 스케줄러 테스트 통과 확인

- [x] 8. API 컨트롤러 구현
  - [x] 8.1 NotificationController 구현
    - GET /api/notifications - 내 알림 목록
    - GET /api/notifications/unread-count - 미확인 수
    - POST /api/notifications/:id/read - 확인 처리
    - POST /api/notifications/read-all - 전체 확인
    - _Requirements: 5.1, 5.2, 5.3_

  - [x] 8.2 ProjectMemberController 구현
    - GET /api/projects/:id/members - 멤버 목록
    - POST /api/projects/:id/members - 멤버 추가
    - PATCH /api/projects/:id/members/:memberId - 역할 변경
    - DELETE /api/projects/:id/members/:memberId - 멤버 제거
    - _Requirements: 3.2_

  - [x] 8.3 NotificationSettingController 구현
    - GET /api/projects/:id/notification-settings - 설정 조회
    - PATCH /api/projects/:id/notification-settings - 설정 변경
    - _Requirements: 4.1, 4.2_

- [x] 9. 이벤트 연동 구현
  - [x] 9.1 WorkflowEngine 이벤트 리스너 연동
    - TaskCompletedEvent 수신 → notifyTaskCompleted() 호출
    - TaskStartedEvent 수신 → notifyTaskStarted() 호출
    - EpisodeCompletedEvent 수신 → notifyEpisodeCompleted() 호출
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 10. NotificationModule 통합
  - [x] 10.1 NotificationModule 생성 및 등록
    - 모든 서비스, 컨트롤러 등록
    - AppModule에 import
    - _Requirements: N/A (Setup)_

- [x] 11. Checkpoint - 모듈 통합 완료
  - 전체 통합 테스트 통과 확인

- [x] 12. 프론트엔드 알림 컴포넌트
  - [x] 12.1 알림 목록 컴포넌트 구현
    - frontend/src/components/notifications/notification-list.tsx
    - 알림 목록 표시, 필터링, 페이지네이션
    - _Requirements: 5.1_

  - [x] 12.2 알림 벨 아이콘 컴포넌트 구현
    - frontend/src/components/notifications/notification-bell.tsx
    - 미확인 알림 수 배지 표시
    - 클릭 시 알림 목록 드롭다운
    - _Requirements: 5.3_

  - [x] 12.3 알림 설정 페이지 구현
    - frontend/src/app/projects/[id]/settings/notifications/page.tsx
    - 알림 유형별 활성화/비활성화
    - 임계값 설정
    - _Requirements: 4.1, 4.2_

- [x] 13. Final checkpoint - 전체 구현 완료
  - 모든 테스트 통과 확인
  - API 문서 확인

## Notes

- 기존 Alert 시스템과 병행 운영 (Alert은 시스템 로그, Notification은 개인 알림)
- 사용자 인증 시스템이 없으므로 userId는 임시로 UUID 사용
- 향후 인증 시스템 구현 시 연동 필요

## Progress Summary

| 구분 | 완료 | 미완료 | 진행률 |
|------|------|--------|--------|
| 엔티티 | 0/5 | 5 | 0% |
| 수신자 서비스 | 0/2 | 2 | 0% |
| 알림 서비스 | 0/4 | 4 | 0% |
| 스케줄러 | 0/4 | 4 | 0% |
| API | 0/3 | 3 | 0% |
| 이벤트 연동 | 0/1 | 1 | 0% |
| 모듈 통합 | 0/1 | 1 | 0% |
| 프론트엔드 | 0/3 | 3 | 0% |

**다음 작업**: Task 1.1 @nestjs/schedule 패키지 설치
