# Design: PostgreSQL Migration

## Overview

SQLite에서 PostgreSQL로 마이그레이션하여 프로덕션 환경을 구축합니다.

## Architecture

### 1. 의존성 추가

```
pg (PostgreSQL 드라이버)
@nestjs/config (환경 변수 관리)
```

### 2. 모듈 구조

```
src/
├── config/
│   ├── config.module.ts       # ConfigModule 설정
│   ├── database.config.ts     # TypeORM 설정 팩토리
│   └── typeorm.config.ts      # CLI용 데이터소스 설정
├── migrations/
│   └── *.ts                   # 마이그레이션 파일들
└── app.module.ts              # TypeOrmModule 통합
```

### 3. 환경 설정

```typescript
// database.config.ts
export const getDatabaseConfig = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  host: configService.get('DATABASE_HOST'),
  port: configService.get('DATABASE_PORT'),
  username: configService.get('DATABASE_USER'),
  password: configService.get('DATABASE_PASSWORD'),
  database: configService.get('DATABASE_NAME'),
  entities: [Project, Episode, Milestone, Page, Alert, ProgressSnapshot],
  synchronize: false, // 프로덕션에서는 마이그레이션 사용
  logging: configService.get('NODE_ENV') === 'development',
  poolSize: 10,
  connectTimeoutMS: 10000,
});
```

### 4. 엔티티 변경사항

| 엔티티 | 변경 | 이유 |
|--------|------|------|
| Project | velocityConfig: jsonb | PostgreSQL JSONB 성능 |
| Alert | metadata: jsonb | 인덱싱 가능 |
| ProgressSnapshot | metrics: jsonb | 복잡한 JSON 쿼리 지원 |

### 5. 인덱스 전략

```sql
-- Project
CREATE INDEX idx_project_launch_date ON project(launch_date);

-- Episode
CREATE INDEX idx_episode_project_id ON episode(project_id);
CREATE INDEX idx_episode_due_date ON episode(due_date);

-- Page
CREATE INDEX idx_page_episode_id ON page(episode_id);

-- Alert
CREATE INDEX idx_alert_project_id ON alert(project_id);
CREATE INDEX idx_alert_created_at ON alert(created_at);
```

## Correctness Properties

### Property 1: Database Connection Resilience
- 연결 실패 시 3회 재시도 후 에러 발생
- 재시도 간격: 1초, 2초, 4초 (지수 백오프)

### Property 2: Migration Idempotency
- 동일 마이그레이션 중복 실행 시 에러 없이 스킵
- 롤백 후 재실행 가능

### Property 3: Data Integrity
- 외래 키 제약 조건으로 고아 레코드 방지
- CASCADE DELETE로 연관 데이터 정리

## Test Strategy

- 단위 테스트: SQLite 인메모리 유지
- 통합 테스트: 테스트용 PostgreSQL 컨테이너 (선택적)
- E2E 테스트: SQLite 인메모리 유지
