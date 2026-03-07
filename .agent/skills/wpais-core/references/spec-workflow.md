# Spec Workflow

복잡한 기능은 아래 3파일 구조를 권장합니다.

```text
specs/<feature-name>/
├── requirements.md
├── design.md
└── tasks.md
```

## requirements.md

- 문제 정의
- 사용자/시스템 요구사항
- 성공 조건
- 비범위 항목

## design.md

- 아키텍처 선택
- 데이터 흐름
- API 계약
- 예외 처리
- 테스트 전략

## tasks.md

- 구현 순서
- 검증 순서
- 완료 조건

## 실제 사용법

- 기존 구현 의도 확인: `.kiro/specs/<feature>/`
- 새 기능 시작: `templates/specs/` 템플릿 복사 후 작성
- 구현 중에는 코드가 최신 기준, spec은 의도와 배경 기준

