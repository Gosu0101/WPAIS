# Project Context

## 도메인 구조

- `src/scheduling`: 프로젝트 생성, 런칭일 기반 일정 역산, 마일스톤 계산
- `src/workflow`: 페이지 공정 상태 전이와 의존성 처리
- `src/monitor`: 진행률, 버퍼, 리스크, 건강도, 알림 이력
- `src/notification`: 알림 발송, 수신자 결정, 멤버/설정 관리
- `src/auth`: 회원가입, 로그인, JWT, refresh token
- `src/api`: REST API, DTO, 컨트롤러, 필터

## 실행 컨텍스트

- API 전역 prefix: `/api`
- Swagger: `/api/docs`
- 백엔드 포트는 `.env` 기준
- 프런트 API base는 `frontend/.env.local` 기준
- 개발/운영 DB는 PostgreSQL
- 테스트 DB는 SQLite in-memory

## `.kiro` 해석 방법

- `steering`: 작업 원칙 아카이브
- `hooks`: 과거 Kiro용 경고 규칙
- `specs`: 기능별 요구사항/설계/작업 기록

현재는 코드와 루트 `AGENTS.md`가 우선이고, `.kiro/specs`는 의도 파악과 배경 확인용입니다.

