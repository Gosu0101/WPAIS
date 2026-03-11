# WPAIS

  > 웹툰 제작 일정, 공정, 모니터링, 알림을 통합 관리하는 풀스택 제작 운영 시스템
  > Webtoon Production AI Support System

  [![Backend](https://img.shields.io/badge/Backend-NestJS-E0234E?logo=nestjs&logoColor=white)](#)
  [![Frontend](https://img.shields.io/badge/Frontend-Next.js-000000?logo=nextdotjs&logoColor=white)](#)
  [![Language](https://img.shields.io/badge/Language-TypeScript-3178C6?logo=typescript&logoColor=white)](#)
  [![Database](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)](#)
  [![Testing](https://img.shields.io/badge/Testing-Jest%20%2B%20Supertest-99425B)](#)

  ## Project Summary

  WPAIS는 웹툰 제작 과정에서 반복적으로 발생하는 일정 지연, 공정 병목, 마감 리스크를 줄이기 위해 만든 **제작 운영 지원
  시스템**입니다.

  런칭일이 정해지면 제작 일정을 역산해 프로젝트를 세팅하고,
  에피소드와 페이지 단위 작업 흐름을 관리하며,
  대시보드에서 진행률, 버퍼, 속도, 리스크, 건강도를 한 번에 확인할 수 있도록 설계했습니다.

  현재 저장소에 구현된 범위는 다음에 집중되어 있습니다.

  - 런칭일 기준 제작 일정 자동 계산
  - 페이지 공정 상태 전이 관리
  - 프로젝트 건강도 모니터링
  - 알림 및 프로젝트 멤버 관리
  - JWT 기반 인증/세션 처리
  - Next.js 기반 운영 UI

  ## Why I Built This

  웹툰 제작은 단순한 TODO 관리보다 훨씬 복잡합니다.

  - 런칭일 기준으로 선행 일정이 역산되어야 하고
  - 회차별 제작 속도가 항상 일정하지 않으며
  - 페이지 단위 공정은 선행 작업 의존성을 가지며
  - 일정 지연은 전체 프로젝트 리스크로 연결됩니다

  이 프로젝트는 이런 문제를 단순한 게시판형 관리가 아니라
  **도메인 규칙이 반영된 운영 시스템**으로 풀어내는 것을 목표로 했습니다.

  ## Problem to Solve

  기존 제작 관리 방식의 문제는 크게 네 가지였습니다.

  - 런칭일은 정해졌는데 제작 시작일과 중간 마일스톤이 수동 계산에 의존함
  - 페이지 단위 작업 상태가 흩어져 있어 병목 구간을 빠르게 파악하기 어려움
  - 프로젝트가 얼마나 건강한지 정량적으로 보기 어려움
  - 권한, 세션, 알림이 분리되어 협업 운영 흐름이 끊김

  ## Solution

  WPAIS는 이 문제를 다음 구조로 해결합니다.

  ### 1. 스케줄링 엔진
  런칭일과 회차 수를 입력하면 아래 일정을 자동 계산합니다.

  - seal date
  - production start date
  - hiring start date
  - planning start date
  - episode별 due date
  - milestone 목록

  특히 초반 적응기와 이후 정상기의 속도 차이를 반영해
  회차별 제작 기간을 다르게 계산하는 구조를 적용했습니다.

  ### 2. 페이지 공정 워크플로우 엔진
  페이지는 다음 4단계 공정을 가집니다.

  - `BACKGROUND`
  - `LINE_ART`
  - `COLORING`
  - `POST_PROCESSING`

  각 공정은 다음 상태를 가집니다.

  - `LOCKED`
  - `READY`
  - `IN_PROGRESS`
  - `DONE`

  선행 작업이 완료되어야 다음 작업이 열리도록 상태 전이를 강제했고,
  작업 완료 시 후속 공정이 자동으로 열리도록 구현했습니다.

  ### 3. 모니터링 대시보드
  프로젝트 단위로 아래 지표를 집계합니다.

  - 진행률
  - 버퍼 상태
  - 속도 분석
  - 리스크 수준
  - seal countdown
  - health score
  - alert history

  즉, 단순 현황판이 아니라
  프로젝트가 일정상 안전한지 위험한지를 판단할 수 있는 운영 대시보드를 목표로 했습니다.

  ### 4. 인증 / 권한 / 알림
  운영 도구로 쓰기 위해 다음 기능을 함께 구성했습니다.

  - 회원가입 / 로그인 / 로그아웃
  - access token + refresh cookie 기반 세션 구조
  - 프로젝트 권한 가드
  - 사용자 알림 / 프로젝트 alert 분리
  - 프로젝트 멤버 조회 및 관리
  - 프로젝트별 알림 설정

  ## Key Features

  - 런칭일 기준 역산 스케줄 계산
  - episode / milestone 자동 생성
  - 페이지 공정 상태 전이 엔진
  - 프로젝트 진행률 및 health score 대시보드
  - 위험 신호와 alert history 조회
  - 캘린더 기반 일정 조회 및 조정
  - 프로젝트 멤버 관리
  - 알림 센터 및 알림 설정
  - JWT 인증 및 refresh token 세션 관리
  - Swagger 문서 제공
  - 단위 / 통합 / E2E 테스트 구성

  ## Tech Stack

  ### Backend
  - NestJS 11
  - TypeScript
  - TypeORM
  - PostgreSQL
  - Passport JWT
  - Event Emitter
  - Swagger
  - Jest
  - Supertest

  ### Frontend
  - Next.js 16 App Router
  - React 18
  - Tailwind CSS
  - TanStack Query
  - FullCalendar
  - Radix UI

  ### Test Environment
  - SQLite in-memory for tests

  ## Architecture

  ```text
  frontend (Next.js)
    -> /api proxy
  backend (NestJS)
    -> auth
    -> scheduling
    -> workflow
    -> monitor
    -> notification
    -> api
  database (PostgreSQL)

  도메인 모듈은 다음처럼 나눴습니다.

  - scheduling: 프로젝트, 에피소드, 마일스톤 일정 계산
  - workflow: 페이지 공정 상태 전이
  - monitor: 진행률, 속도, 버퍼, 리스크, health score
  - notification: 알림, 프로젝트 멤버, 알림 설정
  - auth: JWT, refresh token, guards
  - api: REST controller, DTO, exception filter
```

  ## Technical Highlights

  ### 1. 도메인 규칙을 코드로 강제하는 설계

  이 프로젝트에서 가장 중요하게 본 부분은
  CRUD를 만드는 것이 아니라 비즈니스 규칙을 시스템 레벨에서 강제하는 것이었습니다.

  예를 들어 워크플로우 엔진은 다음을 보장합니다.

  - 유효하지 않은 상태 전이는 차단
  - 선행 공정 미완료 시 후속 작업 시작 차단
  - 완료 시 다음 작업 자동 unlock
  - 에피소드 전체 진행률 계산 가능

  즉, 사람이 규칙을 기억해서 맞추는 방식이 아니라
  시스템이 잘못된 작업 흐름을 막는 구조를 만들었습니다.

  ### 2. 역산 기반 스케줄 계산

  단순히 시작일에서 앞으로 미는 방식이 아니라
  런칭일에서 뒤로 계산하는 제작 일정 모델을 구현했습니다.

  이를 통해:

  - 목표 런칭일 기준 계획 가능
  - 마일스톤 자동 계산 가능
  - 회차 수 변경 시 전체 일정 재계산 가능
  - 프로젝트 운영 리스크를 조기에 감지 가능

  ### 3. 모니터링 지표의 서비스 분리

  모니터링 로직은 하나의 거대한 서비스로 뭉치지 않고 역할별로 나눴습니다.

  - BufferStatusService
  - RiskAnalyzerService
  - ProgressService
  - VelocityAnalyzerService
  - HealthCheckService
  - AlertService

  이 구조 덕분에 계산 책임이 분리되고, 테스트와 유지보수가 쉬워졌습니다.

  ### 4. 인증과 프런트 보호 라우트 분리

  인증은 access token과 refresh cookie를 분리했고,
  프런트 보호 라우트는 단순 쿠키 존재 여부가 아니라 세션 검증 API를 기준으로 처리했습니다.

  즉:

  - 클라이언트 상태에만 의존하지 않고
  - 서버 검증을 거친 세션 기준으로 접근 제어
  - refresh token rotation까지 고려한 구조

  ## Screens

  추가하면 좋은 항목:

  - 로그인 화면
  - 프로젝트 목록 화면
  - 프로젝트 대시보드
  - 캘린더 화면
  - 워크플로우 보드
  - 알림 센터
  - 프로젝트 멤버 관리 화면

  여기에 스크린샷이나 GIF를 넣으면 포트폴리오 완성도가 크게 올라갑니다.

  ## Testing

  이 프로젝트는 기능 문서형 프로젝트가 아니라
  실제 동작 검증을 염두에 두고 테스트를 함께 구성했습니다.

  - Unit Test
  - Integration Test
  - E2E Test

  저장소 기준으로 테스트 파일은 총 30개가 포함되어 있습니다.

  검증 범위 예시:

  - 스케줄 계산 로직
  - 속도 설정 검증
  - 워크플로우 상태 전이
  - 인증 / 세션
  - 권한 가드
  - API 프록시
  - 프로젝트 라이프사이클
  - 이벤트 전파
  - 모니터링 계산

  ## Project Structure

  .
  ├─ src/
  │  ├─ api/
  │  ├─ auth/
  │  ├─ scheduling/
  │  ├─ workflow/
  │  ├─ monitor/
  │  ├─ notification/
  │  ├─ config/
  │  └─ migrations/
  ├─ frontend/
  │  ├─ src/app/
  │  ├─ src/components/
  │  ├─ src/lib/api/
  │  ├─ src/lib/hooks/
  │  └─ src/lib/contexts/
  ├─ test/
  ├─ scripts/
  ├─ infmd/
  └─ GETTING_STARTED.md

  ## Running Locally

  ### Backend

  npm install
  npm run migration:run
  npm run start:watch

  ### Frontend

  cd frontend
  npm install
  npm run dev

  ### Default Local URLs

  - Frontend: http://localhost:3000
  - Backend: http://localhost:3001
  - Swagger: http://localhost:3001/api/docs

  ## Environment

  ### Backend .env

  NODE_ENV=development
  PORT=3001
  FRONTEND_URL=http://localhost:3000

  DATABASE_HOST=localhost
  DATABASE_PORT=5432
  DATABASE_USER=postgres
  DATABASE_PASSWORD=your_db_password
  DATABASE_NAME=wpais_db

  JWT_SECRET=replace-with-a-long-random-secret
  JWT_ALGORITHM=HS256
  JWT_EXPIRES_IN=15m
  REFRESH_TOKEN_EXPIRES_IN=7d

  ### Frontend frontend/.env.local

  NEXT_PUBLIC_API_URL=http://localhost:3001/api

  ## What I Learned

  이 프로젝트를 통해 단순한 웹 서비스 구현보다 더 중요한 몇 가지를 명확히 배웠습니다.

  - 도메인 규칙은 UI가 아니라 백엔드가 강제해야 한다
  - 운영 대시보드는 데이터 나열보다 해석 가능한 지표가 중요하다
  - 인증은 토큰 발급보다 세션 검증 흐름 설계가 더 중요하다
  - 모듈 경계를 명확히 나누면 테스트와 유지보수가 쉬워진다
  - 풀스택 프로젝트는 화면 구현보다 데이터 흐름과 책임 분리가 핵심이다

  ## Limitations

  현재 구현 범위 기준으로 보면, 프로젝트명에 포함된 AI Support 중
  실제 코드에 구현된 핵심은 AI 추천 기능 자체보다 운영 자동화와 제작 관리 로직입니다.

  즉, 현재 버전은 다음에 더 가깝습니다.

  - 제작 운영 시스템
  - 일정/공정/리스크 관리 시스템
  - 협업용 백오피스

  향후 AI 기능을 붙인다면 다음 확장이 자연스럽습니다.

  - 일정 지연 예측
  - 위험 회차 조기 추천
  - 병목 원인 분석
  - 생산성 기반 추천 일정 보정
  - 알림 우선순위 자동화

  ## Future Improvements

  - AI 기반 일정 지연 예측
  - 프로젝트 건강도 예측 모델
  - 작업자별 생산성 분석
  - 실시간 협업 이벤트 반영
  - 파일 업로드 및 작업 산출물 연결
  - 관리자/작가 역할별 UI 분리 강화
  - 운영 배포 파이프라인 정리

  ## Author

  - GitHub: Gosu0101 (https://github.com/Gosu0101)

  ## Repository
