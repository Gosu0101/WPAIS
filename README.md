# WPAIS

웹툰 제작 AI 지원 시스템(WPAIS)입니다.  
프로젝트 일정 계산, 에피소드 단위 제작 관리, 페이지 공정 워크플로우, 진행률 모니터링, 알림, 캘린더, 인증 기능을 하나의 서비스로 묶은 풀스택 애플리케이션입니다.

백엔드는 NestJS + TypeORM + PostgreSQL 기반이며, 프런트엔드는 Next.js(App Router) 기반으로 구성되어 있습니다.

## 1. 프로젝트 개요

이 프로젝트는 웹툰 제작 과정에서 반복적으로 발생하는 다음 문제를 줄이기 위해 만들어졌습니다.

- 런칭일에 맞춘 제작 일정 역산
- 에피소드별 마감일과 마일스톤 관리
- 페이지 단위 공정 상태 추적
- 프로젝트 전체 진행률과 병목 구간 파악
- 위험 신호와 알림 관리
- 팀원별 역할과 프로젝트 접근 제어

핵심적으로는 "런칭일이 정해지면 제작 일정을 계산하고, 실제 작업 진행 상태를 반영해 프로젝트 건강도를 추적하는 시스템"입니다.

## 2. 주요 기능

### 2.1 프로젝트 및 일정 관리

- 프로젝트 생성 시 런칭일 기준으로 마스터 스케줄을 계산합니다.
- 프로젝트별 `sealDate`, `productionStartDate`, `hiringStartDate`, `planningStartDate`를 자동 산출합니다.
- 프로젝트 수정 시 런칭일이 바뀌면 전체 일정과 마일스톤을 재계산합니다.
- 마일스톤 목록을 날짜순으로 조회할 수 있습니다.

### 2.2 에피소드 관리

- 프로젝트별 에피소드 목록 조회를 지원합니다.
- 에피소드 상세 조회 시 페이지 목록을 포함해 반환합니다.
- 기존 데이터에 페이지가 없는 경우, 상세 조회 시 기본 페이지 데이터를 자동 생성합니다.

### 2.3 페이지 공정 워크플로우

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

워크플로우 규칙:

- 선행 공정이 끝나야 다음 공정을 시작할 수 있습니다.
- 작업 완료 시 다음 공정이 자동으로 잠금 해제됩니다.
- 에피소드의 첫 작업이 시작되면 에피소드 상태가 `IN_PROGRESS`로 변경됩니다.
- 모든 페이지의 모든 공정이 완료되면 에피소드 상태가 `COMPLETED`로 변경됩니다.

### 2.4 모니터링 및 대시보드

프로젝트별로 다음 데이터를 조회할 수 있습니다.

- 전체 대시보드
- 버퍼 상태
- 리스크 분석
- 속도 분석 및 트렌드
- 건강 점검 결과
- 알림 히스토리

프런트엔드 대시보드에서는 다음 정보를 한눈에 볼 수 있습니다.

- 프로젝트 진행률
- 7+3 버퍼 상태
- 속도 부족 여부
- 리스크 레벨
- seal countdown
- 건강 점수

### 2.5 알림 및 협업 기능

- 사용자별 알림 목록 조회
- 미확인 알림 수 조회
- 개별 알림 읽음 처리
- 전체 알림 읽음 처리
- 프로젝트 멤버 조회 및 추가/삭제
- 프로젝트별 알림 설정 조회/수정

프로젝트 생성 시 생성자는 자동으로 해당 프로젝트의 `PD` 역할 멤버로 등록됩니다.

### 2.6 인증 및 권한

- 회원가입
- 로그인
- 리프레시 토큰 세션 유효성 확인
- 액세스 토큰 발급
- 리프레시 토큰 쿠키 기반 재발급
- 로그아웃
- 현재 로그인 사용자 조회

인증 구조는 다음과 같습니다.

- 액세스 토큰: Authorization Bearer 헤더 사용
- 리프레시 토큰: HttpOnly 쿠키 사용
- 프런트 보호 라우트는 Next.js proxy에서 `GET /api/auth/session`으로 리프레시 토큰 세션을 먼저 검증합니다.
- 기본적으로 대부분의 API는 인증이 필요합니다.
- `@Public()`이 지정된 엔드포인트만 비로그인 접근이 가능합니다.
- 일부 프로젝트 API는 프로젝트 권한 가드로 추가 보호됩니다.

### 2.7 알림 모델과 설정 경계

- 헤더와 `/notifications`는 사용자 단위 `notifications`를 사용합니다.
- `/projects/{id}/alerts`는 프로젝트 상태 분석 결과인 `alerts`를 보여줍니다.
- `/settings`는 계정과 전역 진입점을 다루고, 실제 프로젝트 알림 규칙 수정은 `/projects/{id}/settings/notifications`에서 처리합니다.
- 즉, 사용자에게 도착한 메시지는 `notifications`, 프로젝트 건강도와 리스크 신호는 `alerts`로 구분합니다.

## 3. 시스템 구성

### 3.1 백엔드

- Framework: NestJS 11
- ORM: TypeORM 0.3
- Database: PostgreSQL
- Auth: Passport JWT
- Docs: Swagger
- Event: `@nestjs/event-emitter`
- Scheduler: `@nestjs/schedule`

### 3.2 프런트엔드

- Framework: Next.js 16
- UI: React 18
- Styling: Tailwind CSS
- Data Fetching: TanStack Query
- Calendar: FullCalendar

### 3.3 테스트

- Unit Test: Jest
- Integration Test: Jest
- E2E Test: Supertest
- 테스트 환경 DB: SQLite in-memory

중요:

- 실제 애플리케이션 실행 환경은 PostgreSQL을 사용합니다.
- 테스트 환경만 SQLite 메모리 DB로 동작합니다.

## 4. 저장소 구조

```text
.
├─ src/                  # NestJS 백엔드
│  ├─ api/               # REST 컨트롤러, DTO, 필터
│  ├─ auth/              # 인증, JWT, 가드, 사용자
│  ├─ scheduling/        # 프로젝트/에피소드/마일스톤 일정 계산
│  ├─ workflow/          # 페이지 공정 상태 전이 로직
│  ├─ monitor/           # 진행률, 리스크, 건강도, 알림 분석
│  ├─ notification/      # 알림, 멤버, 설정
│  └─ config/            # 환경 변수 및 DB 설정
├─ frontend/             # Next.js 프런트엔드
│  ├─ src/app/           # App Router 페이지
│  ├─ src/components/    # 화면 컴포넌트
│  ├─ src/lib/api/       # API 클라이언트
│  ├─ src/lib/hooks/     # React Query 기반 훅
│  └─ src/lib/contexts/  # 인증 컨텍스트 등
├─ test/                 # 통합/E2E 테스트
├─ scripts/              # 보조 스크립트
├─ infmd/                # 설계 문서 및 아이디어 메모
└─ GETTING_STARTED.md    # 빠른 실행 가이드
```

## 5. 사전 요구사항

- Node.js 18 이상
- npm
- PostgreSQL 15 이상

권장:

- 백엔드와 프런트엔드를 각각 별도 터미널에서 실행
- `.env`와 `frontend/.env.local`을 분리 관리

## 6. 환경 변수

### 6.1 백엔드 `.env`

루트 경로에 `.env` 파일을 생성합니다.

```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000

DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_db_password
DATABASE_NAME=wpais_db
DATABASE_POOL_SIZE=10
DATABASE_CONNECT_TIMEOUT=10000

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=5
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX=300
```

설명:

- `FRONTEND_URL`: CORS 허용 출처입니다. 로컬 기본 프런트 주소는 `http://localhost:3000`입니다.
- `JWT_SECRET`: 인증 기능에 필요합니다. 개발 환경에서도 반드시 지정하는 것을 권장합니다.
- `PORT`: 백엔드 기본 포트입니다. 로컬 기본값은 `3001`입니다.
- 로그인 rate limit 기본값은 15분당 5회입니다.
- 일반 API rate limit 기본값은 1분당 300회입니다.

### 6.2 프런트엔드 `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

설명:

- 브라우저는 프런트 origin의 `/api/...`로 요청합니다.
- Next.js route handler가 `/api/*`를 백엔드 `NEXT_PUBLIC_API_URL`로 프록시합니다.
- 로그인/세션 검증은 이 same-origin `/api` 경로를 사용하므로, 쿠키 기반 인증 흐름이 더 안정적입니다.

## 7. 로컬 실행 방법

### 7.1 의존성 설치

루트에서 백엔드 의존성을 설치합니다.

```bash
npm install
```

프런트엔드 의존성도 설치합니다.

```bash
cd frontend
npm install
```

### 7.2 데이터베이스 생성

PostgreSQL에서 데이터베이스를 생성합니다.

```sql
CREATE DATABASE wpais_db;
```

### 7.3 마이그레이션 실행

루트에서 실행합니다.

```bash
npm run migration:run
```

### 7.4 백엔드 실행

```bash
npm run start:watch
```

실행 후 확인:

- API 서버: `http://localhost:3001`
- Swagger 문서: `http://localhost:3001/api/docs`

실행 모드 차이:

- `npm run start`: 빌드된 `dist/main.js` 실행
- `npm run start:dev`: 현재 `src` 실행, 자동 재시작 없음
- `npm run start:watch`: 현재 `src` 실행, 파일 저장 시 자동 재시작

개발 중에는 `start:watch`를 기본값으로 권장합니다. `start`는 최신 빌드를 다시 만들지 않았다면 예전 인증 라우트나 API 스키마를 그대로 띄울 수 있습니다.

### 7.5 Rate Limit 동작

- `POST /api/auth/login`은 IP + 이메일 기준으로 rate limit이 적용됩니다.
- 그 외 `/api/*` 요청은 IP 기준 일반 rate limit이 적용됩니다.
- limit 초과 시 `429 Too Many Requests`와 함께 `Retry-After`, `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` 헤더를 반환합니다.
- Health Check: `http://localhost:3001/api/health`

주의:

- 애플리케이션은 전역 API prefix로 `api`를 사용합니다.
- 따라서 대부분의 엔드포인트는 `/api/...` 경로로 접근합니다.
- 개발 중에는 `npm run start`보다 `npm run start:watch` 또는 `npm run start:dev`를 권장합니다.
- `npm run start`는 `dist/main.js`를 실행하므로, 최신 코드가 빌드되지 않았다면 예전 서버가 뜰 수 있습니다.

### 7.5 프런트엔드 실행

`frontend` 디렉터리에서 실행합니다.

```bash
npm run dev
```

로컬 기본 조합은 다음과 같습니다.

- 프런트엔드: `http://localhost:3000`
- 백엔드 API: `http://localhost:3001`
- 브라우저에서 보이는 API 요청: `http://localhost:3000/api/...`

인증 메모:

- 로그인 후 세션 검증은 프런트의 `/api/auth/session`을 통해 수행됩니다.
- 이 요청은 Next.js가 백엔드 `http://localhost:3001/api/auth/session`으로 프록시합니다.

## 8. 빠른 시작 시나리오

처음 확인할 때는 아래 순서가 가장 단순합니다.

1. 백엔드 실행
2. 프런트엔드 실행
3. `POST /api/auth/register`로 사용자 생성
4. `POST /api/auth/login`으로 로그인
5. `POST /api/projects`로 프로젝트 생성
6. 프로젝트 상세 및 대시보드 확인
7. 에피소드 상세에서 페이지 공정 상태 변경
8. 대시보드, 캘린더, 알림 화면에서 결과 확인

Swagger를 사용하면 인증 후 API를 빠르게 검증할 수 있습니다.

## 9. 주요 화면

프런트엔드에는 다음 주요 페이지가 있습니다.

- `/` : 선택된 프로젝트 기준 대시보드 또는 환영 화면
- `/login` : 로그인
- `/register` : 회원가입
- `/projects` : 프로젝트 목록
- `/projects/new` : 프로젝트 생성
- `/projects/[id]` : 프로젝트 상세 대시보드
- `/projects/[id]/episodes` : 에피소드 목록
- `/episodes/[id]` : 에피소드 상세 / 워크플로우 보드
- `/projects/[id]/milestones` : 마일스톤 타임라인
- `/projects/[id]/alerts` : 경고 및 알림 이력
- `/projects/[id]/calendar` : 프로젝트 일정 캘린더
- `/projects/[id]/settings/notifications` : 알림 설정

## 10. 주요 API 엔드포인트

### 10.1 인증

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/session`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### 10.2 프로젝트

- `POST /api/projects`
- `GET /api/projects`
- `GET /api/projects/:id`
- `PATCH /api/projects/:id`
- `DELETE /api/projects/:id`

### 10.3 에피소드 및 페이지

- `GET /api/projects/:projectId/episodes`
- `GET /api/episodes/:id`
- `GET /api/pages/:id`
- `POST /api/pages/:pageId/tasks/:taskType/start`
- `POST /api/pages/:pageId/tasks/:taskType/complete`

### 10.4 모니터링

- `GET /api/projects/:projectId/dashboard`
- `GET /api/projects/:projectId/buffer-status`
- `GET /api/projects/:projectId/risk`
- `GET /api/projects/:projectId/velocity`
- `GET /api/projects/:projectId/health`
- `GET /api/projects/:projectId/alerts`
- `POST /api/alerts/:alertId/acknowledge`

### 10.5 캘린더

- `GET /api/calendar/events`
- `PATCH /api/calendar/events/:id/reschedule`
- `GET /api/projects/:projectId/calendar/events`

입력 검증 메모:

- `projectIds`는 UUID 배열이어야 합니다.
- `types`와 `eventType`은 `episode | milestone | task`만 허용됩니다.

### 10.6 알림 및 멤버 관리

- `GET /api/notifications`
- `GET /api/notifications/unread-count`
- `POST /api/notifications/:id/read`
- `POST /api/notifications/read-all`
- `GET /api/projects/:projectId/members`
- `POST /api/projects/:projectId/members`
- `PATCH /api/projects/:projectId/members/:memberId`
- `DELETE /api/projects/:projectId/members/:memberId`
- `GET /api/projects/:projectId/notification-settings`
- `PATCH /api/projects/:projectId/notification-settings`

계약 메모:

- `notification-settings`는 더 이상 `userId` query string을 받지 않습니다.
- 설정 조회/수정은 항상 현재 로그인 사용자 기준으로 처리됩니다.
- `notifications` query의 `projectId`는 UUID여야 하고, `notificationType`, `severity`, `isRead`, `page`, `limit`도 서버에서 검증됩니다.

## 11. 테스트 실행

루트 경로에서 실행합니다.

### 11.1 전체 테스트

```bash
npm test
```

### 11.2 감시 모드

```bash
npm run test:watch
```

### 11.3 커버리지

```bash
npm run test:cov
```

### 11.4 예시

```bash
npm test -- scheduler.service.spec
npm test -- workflow-engine.service.spec
npm test -- integration
```

테스트 범위에는 다음이 포함됩니다.

- 스케줄 계산 로직
- 워크플로우 엔진 상태 전이
- 모니터링 및 이벤트 전파
- 에러 처리
- 프로젝트 라이프사이클 E2E
- 인증/권한 경계 E2E

## 12. 개발 스크립트

### 백엔드

```bash
npm run build
npm run start
npm run start:dev
npm run start:watch
npm run test
npm run test:cov
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert
npm run migration:show
```

### 프런트엔드

```bash
npm run dev
npm run build
npm run start
```

## 13. 구현상 참고할 점

- API 전역 prefix는 `/api`입니다.
- Swagger 문서는 `/api/docs`에서 확인할 수 있습니다.
- Health Check는 `GET /api/health`입니다.
- 로컬 개발 기본 포트는 프런트 `3000`, 백엔드 `3001`입니다.
- 프런트의 `/api/*`는 Next.js route handler가 백엔드 API로 프록시합니다.
- 대부분의 API는 JWT 인증이 필요합니다.
- 테스트 환경은 SQLite 메모리 DB를 사용하므로, PostgreSQL 전용 기능과 100% 동일하지 않을 수 있습니다.
- WSL에서 테스트 실행 시 `sqlite3`가 Windows 바이너리로 설치되어 있으면 `invalid ELF header`가 날 수 있습니다. 이 경우 루트에서 `npm rebuild sqlite3`를 다시 실행해야 합니다.
- `scripts/seed-members.ts`는 기존 데이터 마이그레이션용 보조 스크립트입니다. 사용 전 DB 접속 정보를 반드시 확인해야 합니다.

## 14. 함께 보면 좋은 문서

- [`GETTING_STARTED.md`](./GETTING_STARTED.md): 빠른 실행 중심 가이드
- [`infmd`](./infmd): 기획, 설계, 마스터 플랜 문서
- [`AGENTS.md`](./AGENTS.md): 저장소 공통 에이전트 규칙
- [`.agent/PORTABILITY.md`](./.agent/PORTABILITY.md): `.kiro` 자산의 portable 변환 가이드

## 15. 권장 확인 순서

이 저장소를 처음 파악할 때는 아래 순서가 효율적입니다.

1. `README.md`로 전체 구조 이해
2. `GETTING_STARTED.md`로 로컬 실행
3. Swagger에서 API 동작 확인
4. `src/scheduling`, `src/workflow`, `src/monitor` 순서로 도메인 로직 확인
5. `frontend/src/app`과 `frontend/src/components`로 UI 흐름 확인
