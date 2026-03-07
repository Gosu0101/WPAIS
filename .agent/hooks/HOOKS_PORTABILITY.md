# Hook Portability Map

기존 `.kiro/hooks/*.md`를 그대로 복제하지 않고, 의도별로 재구성한 매핑 문서입니다.

## 매핑 원칙

- `session-new` 성격: `AGENTS.md` 또는 skill로 이동
- `file-saved` 성격: linter, pre-commit, CI, review checklist로 이동
- `bash` 또는 `pre-tool-use` 성격: shell approval 정책, wrapper script, 운영 규칙으로 이동
- `task-complete` 성격: PR checklist, CI summary, release checklist로 이동

## Hook별 권장 이식 방식

| 원본 hook | 의도 | 권장 이식 위치 |
|---|---|---|
| `wpais-session-context.md` | 세션 시작 시 프로젝트 컨텍스트 주입 | `AGENTS.md`, skill reference |
| `api-key-detection.md` | 하드코딩 시크릿 차단 | secret scanner, pre-commit, CI |
| `block-dangerous-commands.md` | 위험 명령 차단 | approval policy, shell wrapper, 운영 규칙 |
| `empty-catch-block.md` | 빈 catch 금지 | ESLint 규칙, review checklist |
| `github-actions-security.md` | GitHub Actions command injection 경고 | workflow review checklist, CI policy |
| `require-tests-reminder.md` | 작업 완료 전 테스트 확인 | PR template, CI required check |
| `security-reminder.md` | 보안 키워드 작업 시 점검 | `AGENTS.md`, review checklist |
| `sensitive-files-warning.md` | 민감 파일 편집 경고 | pre-commit, protected file policy |
| `typeorm-raw-query-warning.md` | 동적 SQL 경고 | lint/review checklist |
| `warn-console-log.md` | console 사용 경고 | lint rule, review checklist |
| `bash-command-optimizer.md` | 비효율 shell 사용 개선 | `AGENTS.md`, shell aliases, internal guide |

## 최소 이식 세트

도구가 단순해서 hook 시스템이 없더라도 아래만 있으면 대부분 대체 가능합니다.

1. `AGENTS.md`
2. secret scanning
3. lint + test CI
4. PR checklist

## 구현 예시

### 정적 검사로 옮기기 좋은 것

- console 사용 제한
- 빈 catch 금지
- raw query 경고
- 민감 파일 보호

### 운영 정책으로 옮기기 좋은 것

- `rm -rf`, `DROP TABLE` 차단
- MCP 사용 시점
- 테스트 없는 머지 금지

### 에이전트 지침으로 옮기기 좋은 것

- 프로젝트 컨텍스트
- 설계 우선 개발 절차
- REST/DTO/보안 기준

