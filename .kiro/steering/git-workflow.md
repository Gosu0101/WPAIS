---
inclusion: manual
---

# Git 워크플로우 가이드

커밋, 브랜치, PR 관련 작업 시 적용하는 가이드라인입니다.

## 커밋 메시지 컨벤션

### 형식
```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Type 종류
| Type | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 | feat(scheduling): add task dependency calculation |
| `fix` | 버그 수정 | fix(workflow): resolve state transition error |
| `refactor` | 리팩토링 | refactor(entity): simplify project validation |
| `test` | 테스트 추가/수정 | test(scheduler): add property-based tests |
| `docs` | 문서 수정 | docs(readme): update installation guide |
| `style` | 코드 스타일 | style: apply prettier formatting |
| `chore` | 빌드/설정 | chore(deps): update nestjs to v10 |
| `perf` | 성능 개선 | perf(query): optimize task loading |

### Scope (WPAIS 프로젝트)
- `scheduling` - 스케줄링 엔진
- `workflow` - 워크플로우 엔진
- `entity` - 엔티티/모델
- `api` - API 엔드포인트
- `auth` - 인증/인가
- `config` - 설정
- `deps` - 의존성

### Subject 규칙
- 명령형 현재 시제 사용 (add, fix, change)
- 첫 글자 소문자
- 마침표 없음
- 50자 이내

### 예시
```bash
# 좋은 예
feat(scheduling): add critical path calculation
fix(workflow): prevent invalid state transitions
test(scheduler): add round-trip property test for task serialization
refactor(entity): extract validation logic to separate class

# 나쁜 예
Fixed bug                    # type 없음, 모호함
feat: Add new feature.       # 대문자, 마침표
update code                  # type 없음, 모호함
```

## 브랜치 전략

### 브랜치 네이밍
```
<type>/<issue-number>-<short-description>
```

예시:
- `feat/123-task-dependency`
- `fix/456-state-transition-bug`
- `refactor/789-entity-validation`

### 브랜치 종류
| 브랜치 | 용도 | 머지 대상 |
|--------|------|----------|
| `master` | 프로덕션 | - |
| `develop` | 개발 통합 | master |
| `feat/*` | 기능 개발 | develop |
| `fix/*` | 버그 수정 | develop/master |
| `hotfix/*` | 긴급 수정 | master |

## PR 체크리스트

PR 생성 전 확인:
- [ ] 커밋 메시지 컨벤션 준수
- [ ] 테스트 통과
- [ ] 린트 에러 없음
- [ ] 타입 에러 없음
- [ ] 관련 문서 업데이트
- [ ] 불필요한 console.log 제거
- [ ] .env 파일 커밋 안 함

## 자동화 명령어

### Task 완료 후 커밋 & 푸시
```bash
# 형식
git add .
git commit -m "feat(<scope>): Task N - <description>"
git push origin <branch>
```

### PR 생성
```bash
# GitHub CLI 사용
gh pr create --title "feat(<scope>): <title>" --body "<description>"
```

## WPAIS 프로젝트 규칙

### Task 완료 시 커밋 형식
```
feat(scheduling): Task 1.1 - implement Project entity
feat(workflow): Task 2.3 - add state transition validation
test(scheduler): Task 3.2 - write property tests for deadline calculation
```

### Checkpoint 커밋
```
chore(checkpoint): complete scheduling engine phase 1
```

### 머지 후 정리
```bash
# 로컬 브랜치 정리
git branch -d <merged-branch>

# 원격에서 삭제된 브랜치 정리
git fetch --prune
```
