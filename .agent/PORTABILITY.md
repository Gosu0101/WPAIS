# WPAIS AI Portability Guide

이 문서는 기존 `.kiro` 자산을 다른 에이전트, IDE, CLI 환경에서도 재사용할 수 있도록 정리한 기준 문서입니다.

## 무엇을 추렸는가

`.kiro`에는 세 종류의 정보가 있었습니다.

- `steering`: 작업 방식과 품질 기준
- `hooks`: 위험 패턴 경고와 작업 리마인더
- `specs`: 기능별 요구사항, 설계, 작업 목록

이 중 이식 가치가 높은 요소만 다음 위치로 재구성했습니다.

- 저장소 공통 규칙: [`AGENTS.md`](/mnt/c/pdSystemAI/AGENTS.md)
- portable skill: `.agent/skills/wpais-core/`
- MCP 카탈로그 템플릿: `.agent/mcp/`
- hook 매핑 문서: `.agent/hooks/`
- spec 템플릿: `templates/specs/`

## 환경별 적용 원칙

### 1. 에이전트 지침 계층

가장 넓게 호환되는 방법은 저장소 루트의 `AGENTS.md`를 기준 문서로 두는 것입니다.

- Codex 계열: `AGENTS.md`를 직접 읽도록 구성
- Claude Code/Cline/Cursor 등: workspace instruction 또는 repo rule에 동일 내용을 넣음
- GitHub Copilot Chat 계열: repository custom instructions 또는 `.github/copilot-instructions.md` 성격의 파일에 반영

핵심은 도구별 포맷이 달라도 "규칙의 원문"은 한 군데에 두는 것입니다.

### 2. Skill 이식

Kiro의 steering 문서 전체를 그대로 넣는 대신, 실제 반복 가치가 높은 부분만 skill로 재구성했습니다.

- 프로젝트 컨텍스트
- 도메인 구조
- 백엔드/프런트엔드 규칙
- 테스트/보안/리뷰 기준
- `.kiro/specs` 읽는 방법

Skill을 지원하는 환경에서는 `.agent/skills/wpais-core/`를 그대로 복사해 사용하면 됩니다.

### 3. Hook 이식

Kiro hook의 핵심은 "도구 기능"이 아니라 "검사 의도"입니다.  
다른 환경에서는 아래 세 층으로 분산 적용하면 됩니다.

- 세션 시작 규칙: `AGENTS.md`, skill
- 파일 저장 경고: linter, pre-commit, CI, code review checklist
- 위험 명령 차단: shell wrapper, approval policy, CI, 운영 가이드

자세한 매핑은 `.agent/hooks/HOOKS_PORTABILITY.md`를 사용합니다.

### 4. MCP 이식

MCP는 클라이언트마다 설정 포맷이 다르므로 실행 가능한 단일 파일보다 "카탈로그 + placeholder"가 더 안전합니다.

`.agent/mcp/mcp-catalog.template.yaml`에는 다음만 담았습니다.

- 서버 목적
- 필요한 환경 변수
- transport/command placeholder
- 사용 시점

실제 클라이언트별 설정 파일은 이 카탈로그를 보고 각 도구 형식으로 변환하면 됩니다.

### 5. Spec 이식

`.kiro/specs` 구조는 특정 도구에 묶이지 않고 그대로 재사용 가능합니다.

- `requirements.md`
- `design.md`
- `tasks.md`

새 기능을 다른 환경에서 진행할 때도 이 3파일 구조를 유지하는 것이 가장 재사용성이 높습니다.

## 권장 운용 방식

1. 규칙 원문은 `AGENTS.md`에 둡니다.
2. 반복 업무 절차는 skill로 둡니다.
3. 도구별 설정 차이는 MCP 카탈로그와 hook 매핑 문서에서 해소합니다.
4. 기능 계획은 `templates/specs/` 템플릿으로 시작합니다.
5. 기존 `.kiro`는 아카이브로 유지하고, 새 기준은 `.agent/`로 관리합니다.

