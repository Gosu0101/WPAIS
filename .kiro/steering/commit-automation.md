---
inclusion: manual
---

# 커밋 자동화 가이드

Git 커밋, 푸시, PR 생성을 자동화하는 가이드입니다.

## 자동 커밋 워크플로우

### /commit 패턴

**수행 작업**:
1. `git status` 분석
2. staged/unstaged 변경사항 검토
3. 최근 커밋 메시지 스타일 분석
4. 적절한 커밋 메시지 생성
5. 파일 스테이징 및 커밋

**자동 생성 메시지 형식**:
```
<type>(<scope>): <subject>

- 변경사항 1
- 변경사항 2

Co-authored-by: Kiro <kiro@aws.com>
```

**주의사항**:
- `.env`, `credentials.json` 등 민감 파일 자동 제외
- 커밋 전 변경사항 확인 권장

---

### /commit-push-pr 패턴

**수행 작업**:
1. 브랜치 생성 (main/master에서 작업 시)
2. 변경사항 커밋
3. origin으로 푸시
4. PR 생성 (GitHub MCP 사용)

**PR 설명 자동 생성**:
```markdown
## 요약
- 변경사항 1
- 변경사항 2

## 테스트 계획
- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] 수동 테스트 완료

## 관련 이슈
Closes #123
```

---

## WPAIS 프로젝트 커밋 규칙

### Task 완료 시 자동 커밋

**형식**:
```
feat(<module>): Task <N> - <description>

- 구현 내용 1
- 구현 내용 2

Spec: .kiro/specs/<feature>/tasks.md
```

**예시**:
```
feat(scheduling): Task 1.1 - implement Project entity

- Project 엔티티 클래스 생성
- 기본 필드 및 관계 정의
- 검증 데코레이터 추가

Spec: .kiro/specs/scheduling-engine/tasks.md
```

### Checkpoint 커밋

**형식**:
```
chore(checkpoint): <phase> complete

- 완료된 Task 목록
- 다음 단계 예고

Notion: 진행 상황 업데이트됨
```

---

## 자동화 트리거

### Task 완료 시
```
Task 완료 → GitHub MCP 커밋 & 푸시
```

### Checkpoint 도달 시
```
Checkpoint → GitHub MCP 커밋 & 푸시 → Notion MCP 업데이트
```

---

## 브랜치 정리 자동화

### /clean_gone 패턴

**수행 작업**:
1. `[gone]` 상태 브랜치 식별
2. 관련 worktree 제거
3. 로컬 브랜치 삭제
4. 정리 결과 보고

**사용 시점**:
- PR 머지 후
- 여러 브랜치 작업 완료 후
- 정기적인 저장소 정리

---

## 커밋 전 체크리스트

자동 커밋 전 확인:
- [ ] 테스트 통과 (`npm test`)
- [ ] 린트 에러 없음 (`npm run lint`)
- [ ] 타입 에러 없음 (`npm run build`)
- [ ] console.log 제거
- [ ] 민감 정보 없음

---

## MCP 연동

### GitHub MCP 사용
```typescript
// 커밋 & 푸시
mcp_github_push_files({
  owner: 'Gosu0101',
  repo: 'WPAIS',
  branch: 'master',
  files: [...],
  message: 'feat(scheduling): Task 1.1 - ...'
});
```

### Notion MCP 사용
```typescript
// 진행 상황 업데이트
mcp_notionApi_API_patch_page({
  page_id: '2ee957a2-44d2-802a-92b2-ca7950727db1',
  properties: {
    // 상태 업데이트
  }
});
```
