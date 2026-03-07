# Remaining Dirty Worktree Snapshot

기준 시점:

- 브랜치: `checkpoint/2026-03-07-working-tree`
- 이미 커밋된 변경:
  - `4336c8d` `feat: harden auth, permissions, and validation`
  - `325e43a` `docs: add agent guides and update setup docs`
  - `ab7f1af` `chore: document remaining dirty worktree`
  - `147861c` `fix: tighten cors origin handling`
  - `4f9fe33` `chore: add safe member seeding script`

추가 확인 결과:

- `scripts/seed-members.ts`는 안전한 환경 변수 기반 스크립트로 정리되어 커밋됨
- 현재 남아 있는 대규모 modified 파일은 대부분 `git diff --ignore-cr-at-eol` 기준 실질 내용 변경이 없음
- 즉 현재 remaining dirty는 주로 줄바꿈(EOL) 차이로 보아야 함

## 현재 남은 변경 범위

- 남은 modified 파일은 이번 커밋 범위 밖의 기존 작업 트리이며, 현재 기준으로는 대부분 EOL-only 차이입니다.
- `git diff --stat` 기준 약 `285 files changed`
- 대략적인 디렉터리 분포:
  - `frontend/src`: 71
  - `src/api`: 33
  - `src/auth`: 26
  - `.kiro/specs`: 26
  - `src/scheduling`: 23
  - `src/monitor`: 19
  - `.kiro/steering`: 16
  - `src/workflow`: 14
  - `src/notification`: 14
  - `.kiro/hooks`: 11
  - `test/integration`: 6
  - `test/utils`: 4
  - `src/config`: 4

## 성격별 묶음

1. 프런트 대규모 UI/페이지 변경
- `frontend/src/app/*`
- `frontend/src/components/*`
- `frontend/src/lib/*`
- `frontend/src/types/*`

2. 백엔드 광범위 리팩터링/기능 확장
- `src/api/*`
- `src/auth/*`
- `src/monitor/*`
- `src/notification/*`
- `src/scheduling/*`
- `src/workflow/*`

3. 테스트 전면 수정
- `test/e2e/*`
- `test/integration/*`
- `test/utils/*`

4. Kiro 자산 갱신
- `.kiro/hooks/*`
- `.kiro/specs/*`
- `.kiro/steering/*`

5. 환경/루트 설정 변경
- `.env.example`
- `.gitignore`
- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `src/config/*`
- `src/main.ts`
- `src/app.module.ts`

6. 미분류/확인 필요
- `query` modified

## 추천 정리 순서

1. `frontend`만 따로 리뷰
- 화면/UX 변경이 너무 넓어서 별도 커밋/브랜치 검토가 필요

2. `backend domain`만 따로 리뷰
- `scheduling`, `workflow`, `monitor`, `notification`, `auth`를 기능 축으로 분리

3. `tests`를 코드 변경과 다시 매칭
- 현재 테스트만 분리 커밋하면 의미가 약하므로 기능 커밋에 재배치하는 편이 맞음

4. `.kiro` 자산은 마지막에 별도 커밋
- 제품 코드와 섞지 않는 것이 안전

5. `scripts/`, `query`, 루트 설정은 의도 확인 후 처리
- 현재는 출처/용도가 불명확한 파일이 있어 바로 커밋하지 않는 편이 맞음

## 바로 다음 액션 추천

- 현재 상태에선 추가 기능 커밋보다 EOL 정리 여부를 먼저 결정하는 편이 맞음
- 줄바꿈 변경을 유지하지 않을 경우, 사용자 승인 후 별도 정규화/정리 작업 필요
- 줄바꿈 변경을 유지할 경우, 이 5개 커밋만 기준으로 push/PR 준비 진행 가능
