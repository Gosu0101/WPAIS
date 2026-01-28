# 인증/권한 시스템 (Authentication & Authorization System)

## Overview

WPAIS 웹툰 제작 관리 시스템의 사용자 인증 및 권한 관리 시스템입니다. JWT 기반 인증, 역할 기반 접근 제어(RBAC), 프로젝트별 권한 관리를 구현합니다.

## User Stories

### 1. 사용자 등록 및 로그인

#### 1.1 회원가입
- **As a** 신규 사용자
- **I want to** 이메일과 비밀번호로 계정을 생성하고 싶다
- **So that** 시스템에 접근할 수 있다

**Acceptance Criteria:**
- 이메일, 비밀번호, 이름으로 회원가입 가능
- 이메일 중복 검증
- 비밀번호 최소 8자, 영문+숫자 조합 필수
- 비밀번호는 bcrypt로 해시 저장

#### 1.2 로그인
- **As a** 등록된 사용자
- **I want to** 이메일과 비밀번호로 로그인하고 싶다
- **So that** 인증된 상태로 시스템을 사용할 수 있다

**Acceptance Criteria:**
- 이메일/비밀번호 검증 후 JWT 토큰 발급
- Access Token (15분) + Refresh Token (7일) 발급
- 로그인 실패 시 명확한 에러 메시지

#### 1.3 토큰 갱신
- **As a** 로그인한 사용자
- **I want to** Access Token이 만료되면 자동으로 갱신하고 싶다
- **So that** 재로그인 없이 서비스를 계속 사용할 수 있다

**Acceptance Criteria:**
- Refresh Token으로 새 Access Token 발급
- Refresh Token 만료 시 재로그인 필요
- 토큰 갱신 시 Refresh Token도 함께 갱신 (Rotation)

### 2. 시스템 역할 (System Roles)

#### 2.1 관리자 역할
- **As a** 시스템 관리자
- **I want to** 모든 프로젝트와 사용자를 관리하고 싶다
- **So that** 시스템 전체를 운영할 수 있다

**Acceptance Criteria:**
- ADMIN 역할은 모든 리소스에 접근 가능
- 사용자 계정 활성화/비활성화 가능
- 시스템 설정 변경 가능

#### 2.2 일반 사용자 역할
- **As a** 일반 사용자
- **I want to** 내가 속한 프로젝트에만 접근하고 싶다
- **So that** 권한 범위 내에서 작업할 수 있다

**Acceptance Criteria:**
- USER 역할은 자신이 멤버인 프로젝트만 접근 가능
- 프로젝트 내 역할(PD/WORKER)에 따라 권한 차등

### 3. 프로젝트 권한 (Project Permissions)

#### 3.1 PD 권한
- **As a** 프로젝트 PD
- **I want to** 프로젝트의 모든 설정과 멤버를 관리하고 싶다
- **So that** 프로젝트를 총괄할 수 있다

**Acceptance Criteria:**
- 프로젝트 설정 수정 가능
- 멤버 추가/제거/역할 변경 가능
- 모든 에피소드/페이지 조회 및 수정 가능
- 알림 설정 관리 가능

#### 3.2 작업자 권한
- **As a** 프로젝트 작업자
- **I want to** 내 담당 공정의 작업만 수행하고 싶다
- **So that** 담당 업무에 집중할 수 있다

**Acceptance Criteria:**
- 담당 공정(배경/선화/채색/후보정)의 상태만 변경 가능
- 프로젝트 정보 조회 가능 (읽기 전용)
- 자신의 알림 설정만 변경 가능

### 4. API 보호

#### 4.1 인증 필수 엔드포인트
- **As a** 시스템
- **I want to** 인증되지 않은 요청을 차단하고 싶다
- **So that** 데이터를 보호할 수 있다

**Acceptance Criteria:**
- 공개 API 제외 모든 엔드포인트 인증 필수
- 유효하지 않은 토큰 시 401 Unauthorized
- 권한 부족 시 403 Forbidden

#### 4.2 Rate Limiting
- **As a** 시스템
- **I want to** API 요청 횟수를 제한하고 싶다
- **So that** 서비스 안정성을 보장할 수 있다

**Acceptance Criteria:**
- IP당 분당 100회 요청 제한
- 로그인 시도 분당 5회 제한
- 제한 초과 시 429 Too Many Requests

### 5. 프론트엔드 인증

#### 5.1 로그인 페이지
- **As a** 사용자
- **I want to** 로그인 페이지에서 인증하고 싶다
- **So that** 시스템에 접근할 수 있다

**Acceptance Criteria:**
- 이메일/비밀번호 입력 폼
- 로그인 성공 시 대시보드로 리다이렉트
- 에러 메시지 표시

#### 5.2 인증 상태 관리
- **As a** 프론트엔드
- **I want to** 토큰을 안전하게 저장하고 관리하고 싶다
- **So that** 보안을 유지할 수 있다

**Acceptance Criteria:**
- Access Token은 메모리에 저장
- Refresh Token은 httpOnly 쿠키로 저장
- 토큰 만료 시 자동 갱신
- 로그아웃 시 토큰 삭제

## Technical Requirements

### 보안 요구사항
- 비밀번호: bcrypt (cost factor 12)
- JWT: RS256 알고리즘 (비대칭 키)
- HTTPS 필수 (프로덕션)
- CORS 설정 최소화

### 성능 요구사항
- 로그인 응답 시간 < 500ms
- 토큰 검증 < 50ms

## Out of Scope
- OAuth2/소셜 로그인 (향후 확장)
- 2FA (향후 확장)
- 비밀번호 찾기/재설정 (향후 확장)
