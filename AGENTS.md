# WPAIS Agent Guide

이 저장소는 웹툰 제작 AI 지원 시스템(WPAIS)입니다.  
기존 `.kiro` 자산 중 재사용 가치가 높은 규칙만 추려서 이 파일과 `.agent/` 아래 문서로 이관했습니다.

## 프로젝트 컨텍스트

- 백엔드: NestJS, TypeORM, PostgreSQL
- 프런트엔드: Next.js App Router, React, Tailwind CSS, TanStack Query
- 주요 도메인: scheduling, workflow, monitor, notification, auth, api
- API 전역 prefix: `/api`
- Swagger: `/api/docs`
- 테스트 환경 DB: SQLite in-memory
- 실제 실행 환경 DB: PostgreSQL

## 디렉터리 우선순위

- `src/scheduling`: 프로젝트, 에피소드, 마일스톤 일정 계산
- `src/workflow`: 페이지 공정 상태 전이
- `src/monitor`: 진행률, 버퍼, 리스크, 건강도, 알림 분석
- `src/notification`: 알림, 프로젝트 멤버, 수신 설정
- `src/auth`: JWT, 사용자, 리프레시 토큰, 가드
- `src/api`: 컨트롤러, DTO, 필터
- `frontend/src/app`: 화면 라우팅
- `frontend/src/components`: UI 컴포넌트
- `.kiro/specs`: 기존 기능 요구사항/설계/작업 기록
- `.agent`: 다른 에이전트/IDE로 옮겨 쓸 수 있는 portable 자산

## 작업 원칙

- 먼저 관련 코드를 읽고 기존 패턴을 따른다.
- 검색은 `rg`, 파일 목록은 `rg --files`를 우선 사용한다.
- 새 기능은 가능하면 요구사항, 설계, 작업 목록으로 나누어 생각한다.
- 큰 변경은 테스트 전략까지 포함해 설계한 뒤 구현한다.
- 코드보다 문서가 다르면 코드가 현재 동작 기준이다. `.kiro/specs`는 의도와 배경을 확인할 때만 참고한다.

## 백엔드 규칙

- 컨트롤러는 리소스 중심 REST 경로를 사용한다.
- DTO에는 검증 데코레이터를 붙인다.
- `@Body()`뿐 아니라 `@Query()`도 가능하면 DTO로 받고 검증한다.
- 가능한 경우 TypeORM Repository 메서드를 우선 사용한다.
- Raw query는 꼭 필요한 경우에만 사용하고 파라미터 바인딩을 강제한다.
- 에러는 조용히 삼키지 않는다. 빈 `catch`는 금지한다.
- `console.*` 대신 Nest logger를 우선 고려한다.

## 프런트엔드 규칙

- 기존 App Router 구조와 컴포넌트 분리를 유지한다.
- 서버 상태는 현재 패턴대로 React Query 훅을 통해 다룬다.
- 인증 흐름은 access token + refresh cookie 구조를 깨지 않는다.
- 보호 라우트는 쿠키 존재 여부만 보지 말고 `/api/auth/session` 같은 서버 검증 경로를 기준으로 판단한다.

## 보안 규칙

- 시크릿, 토큰, 비밀번호, 자격 증명은 코드에 하드코딩하지 않는다.
- 인증/인가 코드를 수정하면 입력 검증, 토큰 만료, 권한 체크를 함께 본다.
- 민감 정보는 로그, 예외 메시지, API 응답에 그대로 노출하지 않는다.
- `.env*`, `*.pem`, `*.key`, credentials 파일 편집 시 커밋 여부를 다시 확인한다.

## 품질 게이트

- 관련 테스트가 있으면 우선 실행한다.
- 새 로직에는 최소 단위 테스트를 추가하는 쪽을 기본값으로 둔다.
- E2E가 없어도 핵심 플로우는 통합 테스트로 검증한다.
- README, Swagger, DTO가 공개 계약과 어긋나지 않는지 확인한다.
- WSL에서 테스트가 `sqlite3` 네이티브 모듈로 깨지면 `npm rebuild sqlite3`를 먼저 의심한다.

## 스펙 운용

- 기존 `.kiro/specs/*`는 기능별 `requirements.md`, `design.md`, `tasks.md` 구조를 따른다.
- 새 기능을 장기적으로 관리할 필요가 있으면 동일한 3파일 구조를 유지한다.
- 템플릿과 이식 가이드는 `.agent/`와 `templates/specs/`를 참고한다.

## Portable 자산 위치

- Portable skill: `.agent/skills/wpais-core/`
- MCP 카탈로그 템플릿: `.agent/mcp/mcp-catalog.template.yaml`
- Hook 매핑 문서: `.agent/hooks/HOOKS_PORTABILITY.md`
- 환경 이식 가이드: `.agent/PORTABILITY.md`
