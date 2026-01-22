---
version: 1.0
event: pre-tool-use
match: ".github/workflows/**/*.yml"
---

# GitHub Actions 워크플로우 보안

GitHub Actions 워크플로우 파일 편집 시 보안 위험을 경고합니다.

## ⚠️ Command Injection 위험

### 위험한 입력 소스
다음 입력을 `run:` 명령에 직접 사용하면 안 됩니다:

- `github.event.issue.title`
- `github.event.issue.body`
- `github.event.pull_request.title`
- `github.event.pull_request.body`
- `github.event.comment.body`
- `github.event.review.body`
- `github.event.commits.*.message`
- `github.event.head_commit.message`
- `github.head_ref`

### ❌ 위험한 패턴
```yaml
run: echo "${{ github.event.issue.title }}"
```

### ✅ 안전한 패턴
```yaml
env:
  TITLE: ${{ github.event.issue.title }}
run: echo "$TITLE"
```

## 보안 체크리스트
- [ ] 사용자 입력을 환경변수로 전달
- [ ] 환경변수 사용 시 적절한 인용
- [ ] 신뢰할 수 없는 입력 직접 사용 금지

## 참조
- https://github.blog/security/vulnerability-research/how-to-catch-github-actions-workflow-injections-before-attackers-do/
