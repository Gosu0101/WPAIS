---
version: 1.0
event: session-new
match: "**/*"
---

# WPAIS 프로젝트 컨텍스트

새 세션 시작 시 프로젝트 컨텍스트를 자동으로 주입합니다.

## 프로젝트 개요
- **프로젝트명**: WPAIS (웹툰 제작 AI 지원 시스템)
- **목적**: 웹툰 제작 공정의 일정 관리 및 워크플로우 자동화
- **기술 스택**: NestJS, TypeORM, PostgreSQL, Jest, fast-check

## 현재 개발 중인 모듈

### 1. Scheduling Engine (스케줄링 엔진)
- 프로젝트/마일스톤/태스크 관리
- 의존성 기반 일정 계산
- 리소스 할당 및 충돌 감지
- Spec 위치: `.kiro/specs/scheduling-engine/`

### 2. Workflow Engine (워크플로우 엔진)
- 페이지 상태 관리 (DRAFT → IN_PROGRESS → REVIEW → COMPLETED)
- 이벤트 기반 상태 전이
- 작업 이력 추적
- Spec 위치: `.kiro/specs/workflow-engine/`

## MCP 연동 정보
- **GitHub**: https://github.com/Gosu0101/WPAIS (master 브랜치)
- **Notion**: 페이지 ID `2ee957a2-44d2-802a-92b2-ca7950727db1`
- **PostgreSQL**: wpais_db
- **Context7**: NestJS, TypeORM, Jest, fast-check 문서 조회

## 개발 규칙
- TDD 방식 적용 (테스트 먼저 작성)
- Task 완료 시 GitHub 커밋 & 푸시
- Checkpoint 도달 시 Notion 업데이트
- 커밋 메시지 형식: `feat(모듈명): Task N - 작업 내용`

## 인사이트 제공 모드

코드 작성 전후로 교육적 인사이트를 제공해주세요:

```
★ Insight ─────────────────────────────────────
[2-3가지 핵심 포인트]
─────────────────────────────────────────────────
```

## 학습 모드 (선택적)

사용자가 "학습 모드"를 요청하면 다음과 같이 진행:

### 코드 기여 요청 시점
- 비즈니스 로직에 여러 유효한 접근법이 있을 때
- 에러 핸들링 전략 결정 시
- 알고리즘 구현 선택 시
- 데이터 구조 결정 시
- 설계 패턴 선택 시

### 직접 구현하는 경우
- 보일러플레이트 또는 반복 코드
- 명백한 구현 (의미 있는 선택이 없는 경우)
- 설정 또는 셋업 코드
- 단순 CRUD 작업

### 예시 상호작용
```
인증 미들웨어를 설정했습니다. 세션 타임아웃 동작은 보안 vs UX 트레이드오프입니다.

`auth/middleware.ts`에서 `handleSessionTimeout()` 함수를 구현해주세요.

고려사항:
- 자동 연장: UX 향상, 세션이 더 오래 열림
- 하드 타임아웃: 더 안전, 활성 사용자 불편

[5-10줄의 코드로 선호하는 접근법 구현]
```
