# Implementation Plan: PostgreSQL Migration

## Overview

WPAIS 백엔드를 SQLite에서 PostgreSQL로 마이그레이션합니다.

## Tasks

- [x] 1. 의존성 설치 및 기본 설정
  - [x] 1.1 pg 드라이버 및 @nestjs/config 설치
    - npm install pg @nestjs/config
    - _Requirements: 1.1_

  - [x] 1.2 ConfigModule 설정
    - src/config/config.module.ts 생성
    - 환경 변수 검증 스키마 정의
    - _Requirements: 1.2_

  - [x] 1.3 데이터베이스 설정 팩토리 구현
    - src/config/database.config.ts 생성
    - 연결 풀링 설정 포함
    - _Requirements: 1.2, 1.3_

- [x] 2. Checkpoint - 기본 설정 완료
  - PostgreSQL 연결 테스트

- [x] 3. AppModule TypeORM 통합
  - [x] 3.1 AppModule에 TypeOrmModule 추가
    - ConfigService 기반 동적 설정
    - _Requirements: 1.1, 1.2_

  - [x] 3.2 엔티티 등록 확인
    - 모든 엔티티가 TypeORM에 등록되었는지 확인
    - _Requirements: 1.1_

- [x] 4. 엔티티 PostgreSQL 최적화
  - [x] 4.1 UUID 컬럼 타입 변경
    - @PrimaryGeneratedColumn('uuid') 확인
    - _Requirements: 3.1_

  - [x] 4.2 JSON 컬럼을 JSONB로 변경
    - velocityConfig, metadata, metrics 컬럼
    - @Column({ type: 'jsonb' }) 적용
    - _Requirements: 3.2_

  - [x] 4.3 인덱스 데코레이터 추가
    - @Index() 데코레이터로 자주 조회되는 컬럼에 인덱스
    - _Requirements: 3.3_

- [x] 5. Checkpoint - 엔티티 최적화 완료
  - 엔티티 변경사항 검토

- [x] 6. TypeORM CLI 마이그레이션 설정
  - [x] 6.1 데이터소스 설정 파일 생성
    - src/config/typeorm.config.ts (CLI용)
    - _Requirements: 2.1_

  - [x] 6.2 package.json 스크립트 추가
    - migration:generate, migration:run, migration:revert
    - _Requirements: 2.1_

  - [x] 6.3 초기 마이그레이션 생성
    - npm run migration:generate -- -n InitialSchema
    - _Requirements: 2.2_

- [x] 7. 마이그레이션 실행
  - [x] 7.1 PostgreSQL 데이터베이스 생성
    - wpais_db 데이터베이스 생성 확인
    - _Requirements: 2.3_

  - [x] 7.2 마이그레이션 실행
    - npm run migration:run
    - _Requirements: 2.3_

- [x] 8. Checkpoint - 마이그레이션 완료
  - 테이블 생성 확인 (projects, episodes, milestones, pages, alerts, progress_snapshots)

- [x] 9. 테스트 환경 분리
  - [x] 9.1 테스트용 TypeORM 설정 유지
    - test/utils/test-app.module.ts SQLite 설정 유지
    - _Requirements: 4.1_

  - [x] 9.2 환경별 설정 분리
    - NODE_ENV에 따른 설정 분기 (database.config.ts에서 구현됨)
    - _Requirements: 4.2_

- [x] 10. 헬스체크 구현
  - [x] 10.1 DB 헬스체크 엔드포인트
    - GET /health에 DB 연결 상태 포함
    - _Requirements: 5.1_

- [ ] 11. Final checkpoint - PostgreSQL 마이그레이션 완료
  - 전체 테스트 실행
  - API 동작 확인

## Notes

- 테스트는 SQLite 인메모리 유지 (속도)
- 프로덕션만 PostgreSQL 사용
- synchronize: false로 마이그레이션 사용

## Progress Summary

| 구분 | 완료 | 미완료 | 진행률 |
|------|------|--------|--------|
| 기본 설정 | 3/3 | 0 | 100% |
| TypeORM 통합 | 2/2 | 0 | 100% |
| 엔티티 최적화 | 3/3 | 0 | 100% |
| 마이그레이션 설정 | 3/3 | 0 | 100% |
| 마이그레이션 실행 | 2/2 | 0 | 100% |
| 테스트 환경 | 2/2 | 0 | 100% |
| 헬스체크 | 0/1 | 1 | 0% |

**다음 작업**: Task 10.1 DB 헬스체크 엔드포인트 구현
