# Implementation Plan: 인증/권한 시스템 (Auth System)

## Overview

WPAIS 인증/권한 시스템 구현 계획입니다. JWT 기반 인증, 역할 기반 접근 제어(RBAC), 프로젝트별 권한 관리를 구현합니다.

## Tasks

- [x] 1. 패키지 설치 및 기본 설정
  - [x] 1.1 인증 관련 패키지 설치
    - npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt
    - npm install -D @types/bcrypt @types/passport-jwt
    - _Requirements: N/A (Setup)_

  - [x] 1.2 환경 변수 설정
    - JWT_SECRET, JWT_EXPIRES_IN, REFRESH_TOKEN_EXPIRES_IN 추가
    - .env.example 업데이트
    - _Requirements: N/A (Setup)_

- [x] 2. User 엔티티 및 타입 구현
  - [x] 2.1 SystemRole enum 및 타입 정의
    - src/auth/types/auth.types.ts 생성
    - SystemRole (ADMIN, USER), JwtPayload 인터페이스
    - _Requirements: 2.1, 2.2_

  - [x] 2.2 User 엔티티 구현
    - src/auth/entities/user.entity.ts 생성
    - id, email, passwordHash, name, systemRole, isActive, createdAt, updatedAt
    - _Requirements: 1.1_

  - [x] 2.3 RefreshToken 엔티티 구현
    - src/auth/entities/refresh-token.entity.ts 생성
    - id, userId, tokenHash, expiresAt, isRevoked, createdAt
    - _Requirements: 1.3_

- [x] 3. Checkpoint - 엔티티 완료
  - 마이그레이션 생성 및 실행 확인

- [x] 4. AuthService 구현
  - [x] 4.1 비밀번호 해싱 서비스 구현
    - hashPassword(): bcrypt로 해시 생성
    - validatePassword(): 비밀번호 검증
    - _Requirements: 1.1_

  - [x] 4.2 Property test: 비밀번호 평문 저장 금지
    - **Property 1: Password Never Stored in Plain Text**
    - **Validates: Requirements 1.1**

  - [x] 4.3 회원가입 구현
    - register(): 이메일 중복 검증, 비밀번호 해시, 사용자 생성
    - _Requirements: 1.1_

  - [x] 4.4 로그인 구현
    - login(): 사용자 검증, Access Token + Refresh Token 발급
    - _Requirements: 1.2_

  - [x] 4.5 토큰 갱신 구현
    - refreshToken(): Refresh Token 검증, 새 토큰 쌍 발급
    - Token Rotation 적용
    - _Requirements: 1.3_

  - [x] 4.6 로그아웃 구현
    - logout(): Refresh Token 무효화
    - _Requirements: 1.2_

- [x] 5. Checkpoint - AuthService 완료
  - 단위 테스트 통과 확인

- [x] 6. JWT 전략 및 Guards 구현
  - [x] 6.1 JWT Strategy 구현
    - src/auth/strategies/jwt.strategy.ts 생성
    - Access Token 검증 로직
    - _Requirements: 4.1_

  - [x] 6.2 JwtAuthGuard 구현
    - src/auth/guards/jwt-auth.guard.ts 생성
    - 인증 필수 엔드포인트 보호
    - _Requirements: 4.1_

  - [x] 6.3 Property test: 유효한 토큰 필수
    - **Property 2: Valid Token Required for Protected Endpoints**
    - **Validates: Requirements 4.1**

  - [x] 6.4 RolesGuard 구현
    - src/auth/guards/roles.guard.ts 생성
    - 시스템 역할 기반 접근 제어
    - _Requirements: 2.1, 2.2_

  - [x] 6.5 ProjectPermissionGuard 구현
    - src/auth/guards/project-permission.guard.ts 생성
    - 프로젝트 멤버십 및 역할 검증
    - _Requirements: 3.1, 3.2_

  - [x] 6.6 Property test: 프로젝트 접근 권한
    - **Property 3: Project Access Requires Membership**
    - **Validates: Requirements 2.2, 3.1, 3.2**

- [x] 7. Checkpoint - Guards 완료
  - Guards 테스트 통과 확인

- [x] 8. 데코레이터 구현
  - [x] 8.1 @Roles 데코레이터 구현
    - src/auth/decorators/roles.decorator.ts
    - _Requirements: 2.1_

  - [x] 8.2 @CurrentUser 데코레이터 구현
    - src/auth/decorators/current-user.decorator.ts
    - _Requirements: N/A (Utility)_

  - [x] 8.3 @Public 데코레이터 구현
    - src/auth/decorators/public.decorator.ts
    - _Requirements: 4.1_

  - [x] 8.4 @ProjectPermission 데코레이터 구현
    - src/auth/decorators/project-permission.decorator.ts
    - _Requirements: 3.1, 3.2_

- [x] 9. AuthController 구현
  - [x] 9.1 회원가입 엔드포인트
    - POST /api/auth/register
    - _Requirements: 1.1_

  - [x] 9.2 로그인 엔드포인트
    - POST /api/auth/login
    - Refresh Token을 HttpOnly 쿠키로 설정
    - _Requirements: 1.2_

  - [x] 9.3 토큰 갱신 엔드포인트
    - POST /api/auth/refresh
    - _Requirements: 1.3_

  - [x] 9.4 로그아웃 엔드포인트
    - POST /api/auth/logout
    - _Requirements: 1.2_

  - [x] 9.5 현재 사용자 조회 엔드포인트
    - GET /api/auth/me
    - _Requirements: N/A (Utility)_

- [x] 10. AuthModule 통합
  - [x] 10.1 AuthModule 생성 및 등록
    - JwtModule, PassportModule 설정
    - AppModule에 import
    - _Requirements: N/A (Setup)_

- [x] 11. Checkpoint - 백엔드 인증 완료
  - API 테스트 통과 확인

- [x] 12. 기존 API 보호 적용
  - [x] 12.1 전역 JwtAuthGuard 적용
    - APP_GUARD로 전역 설정
    - @Public() 데코레이터로 공개 API 지정
    - _Requirements: 4.1_

  - [x] 12.2 프로젝트 컨트롤러 권한 적용
    - ProjectController에 ProjectPermissionGuard 적용
    - _Requirements: 3.1, 3.2_

  - [x] 12.3 Property test: 작업자 담당 공정만 수정 가능
    - **Property 4: Worker Can Only Modify Assigned Tasks**
    - **Validates: Requirements 3.2**

  - [x] 12.4 알림 시스템 연동
    - NotificationController에 현재 사용자 연동
    - recipientId를 @CurrentUser()로 대체
    - _Requirements: N/A (Integration)_

- [x] 13. Checkpoint - API 보호 완료
  - 권한 테스트 통과 확인

- [x] 14. 프론트엔드 인증 구현
  - [x] 14.1 AuthContext 구현
    - frontend/src/lib/contexts/auth-context.tsx
    - user, isAuthenticated, login, logout, refreshToken
    - _Requirements: 5.2_

  - [x] 14.2 API 클라이언트 인터셉터 추가
    - frontend/src/lib/api/client.ts 수정
    - Authorization 헤더 자동 추가
    - 401 응답 시 토큰 갱신
    - _Requirements: 5.2_

  - [x] 14.3 로그인 페이지 구현
    - frontend/src/app/login/page.tsx
    - 이메일/비밀번호 폼, 에러 표시
    - _Requirements: 5.1_

  - [x] 14.4 회원가입 페이지 구현
    - frontend/src/app/register/page.tsx
    - _Requirements: 1.1_

  - [x] 14.5 Protected Route 미들웨어 구현
    - frontend/src/middleware.ts
    - 인증되지 않은 사용자 로그인 페이지로 리다이렉트
    - _Requirements: 5.2_

- [x] 15. Final checkpoint - 전체 구현 완료
  - 모든 테스트 통과 확인
  - E2E 인증 플로우 테스트

## Notes

- JWT 시크릿은 환경 변수로 관리 (하드코딩 금지)
- 비밀번호는 bcrypt cost factor 12 사용
- Refresh Token Rotation으로 보안 강화
- 기존 ProjectMember 엔티티와 User 엔티티 연결 필요

## Progress Summary

| 구분 | 완료 | 미완료 | 진행률 |
|------|------|--------|--------|
| 패키지/설정 | 2/2 | 0 | 100% |
| 엔티티 | 3/3 | 0 | 100% |
| AuthService | 6/6 | 0 | 100% |
| Guards | 6/6 | 0 | 100% |
| 데코레이터 | 4/4 | 0 | 100% |
| Controller | 5/5 | 0 | 100% |
| API 보호 | 4/4 | 0 | 100% |
| 프론트엔드 | 5/5 | 0 | 100% |

**완료**: 전체 인증/권한 시스템 구현 완료
