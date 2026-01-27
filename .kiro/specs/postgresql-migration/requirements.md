# Requirements: PostgreSQL Migration

## Overview

WPAIS 백엔드를 SQLite에서 PostgreSQL로 마이그레이션하여 프로덕션 환경을 구축합니다.

## User Stories

### 1. PostgreSQL 연결 설정
As a 개발자
I want to PostgreSQL 데이터베이스에 연결
So that 프로덕션 환경에서 안정적인 데이터 저장이 가능합니다

#### Acceptance Criteria
- 1.1 pg 드라이버 설치 및 TypeORM PostgreSQL 설정
- 1.2 환경 변수 기반 DB 연결 설정 (ConfigModule)
- 1.3 연결 풀링 설정 (최대 연결 수, 타임아웃)
- 1.4 연결 실패 시 재시도 로직

### 2. 스키마 마이그레이션
As a 개발자
I want to TypeORM 마이그레이션 시스템 구축
So that 스키마 변경을 버전 관리할 수 있습니다

#### Acceptance Criteria
- 2.1 TypeORM CLI 마이그레이션 설정
- 2.2 초기 스키마 마이그레이션 파일 생성
- 2.3 마이그레이션 실행/롤백 스크립트
- 2.4 시드 데이터 스크립트 (테스트용)

### 3. 엔티티 PostgreSQL 최적화
As a 개발자
I want to PostgreSQL 특화 기능 활용
So that 성능과 데이터 무결성이 향상됩니다

#### Acceptance Criteria
- 3.1 UUID 타입을 PostgreSQL native uuid로 변경
- 3.2 JSON/JSONB 컬럼 타입 최적화
- 3.3 인덱스 추가 (자주 조회되는 컬럼)
- 3.4 외래 키 제약 조건 검증

### 4. 테스트 환경 분리
As a 개발자
I want to 테스트와 프로덕션 DB 환경 분리
So that 테스트가 프로덕션 데이터에 영향을 주지 않습니다

#### Acceptance Criteria
- 4.1 테스트용 SQLite 인메모리 유지
- 4.2 개발/스테이징/프로덕션 환경 설정 분리
- 4.3 환경별 TypeORM 설정 파일

### 5. 데이터베이스 헬스체크
As a 운영자
I want to DB 연결 상태 모니터링
So that 장애를 빠르게 감지할 수 있습니다

#### Acceptance Criteria
- 5.1 /health 엔드포인트에 DB 상태 포함
- 5.2 연결 끊김 시 자동 재연결
- 5.3 쿼리 타임아웃 설정

## Technical Notes

- PostgreSQL 버전: 15+
- TypeORM 마이그레이션 사용
- 환경 변수: DATABASE_HOST, DATABASE_PORT, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
