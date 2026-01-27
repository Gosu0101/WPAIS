# Implementation Plan: API Layer

## Overview

WPAIS REST API 레이어 구현 계획입니다. NestJS 컨트롤러, DTO, Swagger 문서화를 포함합니다.

## Tasks

- [x] 1. 프로젝트 구조 및 기본 설정
  - [x] 1.1 API 모듈 디렉토리 구조 생성
    - src/api/controllers, dto, filters, pipes 폴더 생성
    - _Requirements: 6.1_

  - [x] 1.2 공통 DTO 정의
    - PaginationQueryDto, PaginatedResponse, ErrorResponseDto 정의
    - _Requirements: 6.2_

  - [x] 1.3 HttpExceptionFilter 구현
    - 표준 에러 응답 형식 적용
    - _Requirements: 6.2.1, 6.2.2, 6.2.3_

  - [x] 1.4 Swagger 설정
    - main.ts에 Swagger 문서 설정
    - /api/docs 경로 설정
    - _Requirements: 6.3.4_

- [x] 2. Checkpoint - 기본 설정 완료
  - Ensure all configurations work correctly.

- [x] 3. Project Controller 구현
  - [x] 3.1 Project DTO 정의
    - CreateProjectDto, UpdateProjectDto, ProjectResponseDto, ProjectQueryDto 정의
    - class-validator 데코레이터 적용
    - Swagger 데코레이터 적용
    - _Requirements: 1.1.2, 6.1.1, 6.3.3_

  - [x] 3.2 POST /api/projects 구현
    - 프로젝트 생성 엔드포인트
    - ProjectManagerService.createProject 호출
    - _Requirements: 1.1.1, 1.1.3, 1.1.4_

  - [x] 3.3 GET /api/projects 구현
    - 프로젝트 목록 조회 엔드포인트
    - 페이지네이션 적용
    - _Requirements: 1.2.1, 1.2.3_

  - [x] 3.4 GET /api/projects/:id 구현
    - 프로젝트 상세 조회 엔드포인트
    - ParseUUIDPipe 적용
    - _Requirements: 1.2.2, 1.2.4, 6.4.1_

  - [x] 3.5 PATCH /api/projects/:id 구현
    - 프로젝트 수정 엔드포인트
    - 런칭일 변경 시 스케줄 재계산
    - _Requirements: 1.3.1, 1.3.2, 1.3.3_

- [x] 4. Checkpoint - Project API 완료
  - Test all project endpoints manually.

- [x] 5. Episode Controller 구현
  - [x] 5.1 Episode DTO 정의
    - EpisodeResponseDto, EpisodeDetailResponseDto, EpisodeQueryDto 정의
    - _Requirements: 2.1.2_

  - [x] 5.2 GET /api/projects/:projectId/episodes 구현
    - 에피소드 목록 조회 엔드포인트
    - 에피소드 번호순 정렬
    - _Requirements: 2.1.1, 2.1.3_

  - [x] 5.3 GET /api/episodes/:id 구현
    - 에피소드 상세 조회 엔드포인트
    - 페이지 목록 포함
    - _Requirements: 2.2.1, 2.2.2, 2.2.3_

- [x] 6. Page Controller 구현
  - [x] 6.1 Page DTO 정의
    - PageResponseDto 정의
    - TaskType enum 파라미터 검증
    - _Requirements: 3.3.2, 3.3.3_

  - [x] 6.2 GET /api/pages/:id 구현
    - 페이지 상세 조회 엔드포인트
    - _Requirements: 3.3.1_

  - [x] 6.3 POST /api/pages/:pageId/tasks/:taskType/start 구현
    - 작업 시작 엔드포인트
    - WorkflowEngineService.startTask 호출
    - 의존성 검증 에러 처리 (403)
    - _Requirements: 3.1.1, 3.1.2, 3.1.3, 3.1.4_

  - [x] 6.4 POST /api/pages/:pageId/tasks/:taskType/complete 구현
    - 작업 완료 엔드포인트
    - WorkflowEngineService.completeTask 호출
    - _Requirements: 3.2.1, 3.2.2, 3.2.3, 3.2.4_

- [x] 7. Checkpoint - Workflow API 완료
  - Test workflow state transitions.

- [x] 8. Milestone Controller 구현
  - [x] 8.1 Milestone DTO 정의
    - MilestoneResponseDto 정의
    - _Requirements: 5.1.2_

  - [x] 8.2 GET /api/projects/:projectId/milestones 구현
    - 마일스톤 목록 조회 엔드포인트
    - 날짜순 정렬
    - _Requirements: 5.1.1, 5.1.3_

- [ ] 9. Monitor Controller 구현 (BLOCKED - Monitor 모듈 필요)
  - [ ] 9.1 Monitor DTO 정의
    - DashboardResponseDto, BufferStatusResponseDto, RiskResponseDto 정의
    - VelocityResponseDto, HealthResponseDto, AlertQueryDto 정의
    - _Requirements: 4.1.2, 4.2.2, 4.2.3, 4.3.2, 4.3.3_

  - [ ] 9.2 GET /api/projects/:projectId/dashboard 구현
    - 대시보드 데이터 조회 엔드포인트
    - MonitorService.getDashboardData 호출
    - _Requirements: 4.1.1, 4.1.3_

  - [ ] 9.3 GET /api/projects/:projectId/buffer-status 구현
    - 버퍼 상태 조회 엔드포인트
    - _Requirements: 4.2.1_

  - [ ] 9.4 GET /api/projects/:projectId/risk 구현
    - 리스크 분석 조회 엔드포인트
    - _Requirements: 4.3.1_

  - [ ] 9.5 GET /api/projects/:projectId/velocity 구현
    - 속도 분석 조회 엔드포인트
    - 트렌드 기간 쿼리 파라미터 지원
    - _Requirements: 4.4.1, 4.4.2, 4.4.3_

  - [ ] 9.6 GET /api/projects/:projectId/health 구현
    - 건강 점검 조회 엔드포인트
    - _Requirements: 4.6.1, 4.6.2, 4.6.3, 4.6.4_

  - [ ] 9.7 GET /api/projects/:projectId/alerts 구현
    - 알림 히스토리 조회 엔드포인트
    - 날짜 범위 필터링
    - 페이지네이션 적용
    - _Requirements: 4.5.1, 4.5.2, 4.5.3, 4.5.4_

- [ ] 10. Checkpoint - Monitor API 완료 (BLOCKED)
  - Test all monitoring endpoints.

- [x] 11. API Module 통합
  - [x] 11.1 ApiModule 정의
    - 모든 컨트롤러 등록
    - HttpExceptionFilter 전역 등록
    - _Requirements: 6.2_

  - [x] 11.2 main.ts 업데이트
    - ValidationPipe 전역 설정
    - Swagger 문서 생성
    - CORS 설정
    - _Requirements: 6.1.1, 6.3_

- [ ] 12. Final checkpoint - API Layer 완료 (BLOCKED - Monitor 필요)
  - Verify Swagger documentation at /api/docs.
  - Test all endpoints work correctly.

## Notes

- 모든 컨트롤러에 @ApiTags 적용
- 모든 엔드포인트에 @ApiOperation, @ApiResponse 적용
- ParseUUIDPipe로 모든 ID 파라미터 검증
- 에러 응답은 표준 형식 준수
- **Task 9 (Monitor Controller)는 Monitor 모듈이 git reset으로 손실되어 BLOCKED 상태**
- Monitor 모듈 복구 후 Task 9 진행 가능

## Progress Summary

| 구분 | 완료 | 미완료 | 진행률 |
|------|------|--------|--------|
| 기본 설정 | 4/4 | 0 | 100% |
| Project API | 5/5 | 0 | 100% |
| Episode API | 3/3 | 0 | 100% |
| Page API | 4/4 | 0 | 100% |
| Milestone API | 2/2 | 0 | 100% |
| Monitor API | 0/7 | 7 | 0% (BLOCKED) |
| 통합 | 2/2 | 0 | 100% |

**상태**: ⚠️ 부분 완료 (Monitor 모듈 의존성으로 인해 Task 9 BLOCKED)

