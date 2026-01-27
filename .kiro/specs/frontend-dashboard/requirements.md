# Requirements: Frontend Dashboard

## Overview

WPAIS 웹툰 제작 관리 시스템의 프론트엔드 대시보드를 구현합니다. Next.js 14 App Router를 사용하여 PD(운영 관리자)와 작가를 위한 직관적인 UI를 제공합니다.

## User Stories

### 1. 프로젝트 관리 대시보드
As a PD
I want to 모든 프로젝트의 현황을 한눈에 파악
So that 효율적인 의사결정을 할 수 있습니다

#### Acceptance Criteria
- 1.1 프로젝트 목록을 카드 형태로 표시
- 1.2 각 프로젝트의 진행률, 리스크 레벨, 버퍼 상태 표시
- 1.3 프로젝트 생성/수정/삭제 기능
- 1.4 프로젝트 필터링 및 정렬 기능

### 2. 프로젝트 상세 대시보드
As a PD
I want to 개별 프로젝트의 상세 현황 확인
So that 세부적인 진행 상황을 모니터링할 수 있습니다

#### Acceptance Criteria
- 2.1 7+3 버퍼 상태 시각화 (봉인/비축 에피소드)
- 2.2 에피소드별 진행률 차트
- 2.3 공정별 진행률 breakdown (배경/선화/채색/후보정)
- 2.4 리스크 분석 및 경고 표시
- 2.5 속도 분석 및 트렌드 차트
- 2.6 봉인일 카운트다운 표시
- 2.7 건강 점수 및 권장 조치 표시

### 3. 에피소드 관리
As a PD/작가
I want to 에피소드별 작업 현황 확인
So that 각 에피소드의 진행 상태를 파악할 수 있습니다

#### Acceptance Criteria
- 3.1 에피소드 목록 표시 (번호, 마감일, 상태)
- 3.2 에피소드 상세 페이지 (5개 페이지 현황)
- 3.3 페이지별 공정 상태 시각화

### 4. 워크플로우 관리
As a 작가
I want to 내 작업을 시작하고 완료 처리
So that 공정 릴레이가 원활하게 진행됩니다

#### Acceptance Criteria
- 4.1 페이지별 작업 상태 표시 (LOCKED/READY/IN_PROGRESS/DONE)
- 4.2 작업 시작 버튼 (READY → IN_PROGRESS)
- 4.3 작업 완료 버튼 (IN_PROGRESS → DONE)
- 4.4 의존성 상태 시각화 (다음 공정 잠금 해제 표시)
- 4.5 실시간 상태 업데이트

### 5. 마일스톤 관리
As a PD
I want to 프로젝트 마일스톤 현황 확인
So that 주요 일정을 추적할 수 있습니다

#### Acceptance Criteria
- 5.1 마일스톤 타임라인 표시
- 5.2 완료/미완료 마일스톤 구분
- 5.3 다가오는 마일스톤 알림

### 6. 알림 시스템
As a PD
I want to 중요한 알림을 실시간으로 받기
So that 문제 상황에 빠르게 대응할 수 있습니다

#### Acceptance Criteria
- 6.1 알림 목록 표시
- 6.2 알림 심각도별 구분 (INFO/WARNING/CRITICAL)
- 6.3 알림 확인 처리

### 7. 반응형 디자인
As a 사용자
I want to 다양한 디바이스에서 사용
So that 어디서든 시스템에 접근할 수 있습니다

#### Acceptance Criteria
- 7.1 데스크톱 최적화 레이아웃
- 7.2 태블릿 대응 레이아웃
- 7.3 모바일 기본 지원

## Technical Notes

- Framework: Next.js 14 (App Router)
- Styling: Tailwind CSS
- State Management: React Query (TanStack Query)
- Charts: Recharts 또는 Chart.js
- UI Components: shadcn/ui 기반 커스텀
- API: 기존 NestJS REST API 연동

## Design Direction

- 스타일: 인더스트리얼/유틸리티 + 소프트/모던 혼합
- 컬러: 다크 모드 기본, 라이트 모드 지원
- 폰트: Pretendard (한글), Geist (영문)
- 특징: 데이터 밀도 높음, 기능 중심, 크리에이터 친화적
