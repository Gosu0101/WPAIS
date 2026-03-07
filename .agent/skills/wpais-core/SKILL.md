---
name: wpais-core
description: Guidance for working inside the WPAIS repository, including project context, domain map, safety rules, testing expectations, and how to use archived .kiro specs and portable MCP/hook assets.
---

# WPAIS Core

이 스킬은 WPAIS 저장소에서 작업할 때 사용합니다.

## 사용 시점

- 프로젝트 구조를 빠르게 파악해야 할 때
- scheduling, workflow, monitor, notification, auth, api 영역을 수정할 때
- `.kiro/specs`를 참고해 기능 의도를 확인해야 할 때
- 테스트, 보안, 리뷰 기준을 함께 적용해야 할 때
- 다른 에이전트 환경으로 규칙을 옮겨야 할 때

## 기본 절차

1. 루트의 `AGENTS.md`를 우선 기준으로 삼습니다.
2. 관련 코드와 테스트를 읽고 현재 구현을 파악합니다.
3. 기능 의도가 필요하면 `.kiro/specs/<feature>/`를 확인합니다.
4. 규칙, 품질 기준, 스펙 구조가 더 필요하면 아래 reference를 선택적으로 읽습니다.

## 참고 파일

- 프로젝트 구조와 규칙: `references/project-context.md`
- 품질/보안/테스트 기준: `references/quality-rules.md`
- `.kiro/specs` 운용 방식: `references/spec-workflow.md`

## 선택 규칙

- 백엔드 변경: `references/quality-rules.md`를 읽습니다.
- 기능 설계/확장: `references/spec-workflow.md`를 읽습니다.
- 다른 도구에 규칙 이식: 루트 `.agent/PORTABILITY.md`와 `.agent/mcp/`, `.agent/hooks/` 문서를 사용합니다.

