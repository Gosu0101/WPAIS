---
version: 1.0
event: task-complete
match: "**/*"
action: warn
---

# 테스트 실행 리마인더

🧪 **Task 완료 전 테스트 확인**

## 체크리스트
- [ ] 단위 테스트 실행: `npm test`
- [ ] 관련 테스트 파일 확인: `*.spec.ts`
- [ ] 테스트 커버리지 80% 이상 유지

## 테스트 명령어
```bash
# 전체 테스트
npm test

# 특정 파일 테스트
npm test -- --testPathPattern="project-manager"

# 커버리지 확인
npm test -- --coverage

# watch 모드 (개발 중)
npm test -- --watch
```

## WPAIS TDD 규칙
1. RED: 실패하는 테스트 먼저 작성
2. GREEN: 최소한의 구현으로 통과
3. REFACTOR: 코드 개선 (테스트 유지)
