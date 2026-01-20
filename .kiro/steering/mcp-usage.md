# MCP 사용 가이드

## 자동 사용 규칙

### Task 완료 시
- Task 완료 후 GitHub MCP로 커밋 & 푸시
- 커밋 메시지 형식: `feat(scheduling): Task N - 작업 내용`

### Checkpoint 도달 시
- NotionApi MCP로 진행 상황 업데이트
- wpais 페이지 ID: `2ee957a2-44d2-802a-92b2-ca7950727db1`

### DB 관련 작업 시
- PostgreSQL MCP로 스키마/데이터 확인
- 테이블 생성, 마이그레이션 검증

### 라이브러리 API 확인 시
- Context7 MCP로 최신 문서 조회
- 지원 라이브러리: NestJS, TypeORM, Jest, fast-check 등
- 사용법: `resolve-library-id` → `get-library-docs`

## 프로젝트 정보
- GitHub: https://github.com/Gosu0101/WPAIS
- Notion: https://www.notion.so/wpais-2ee957a244d2802a92b2ca7950727db1
- DB: wpais_db (PostgreSQL)
