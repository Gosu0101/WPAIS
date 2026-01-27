# Implementation Plan: Frontend Dashboard

## Overview

WPAIS 프론트엔드 대시보드 구현 계획입니다. Next.js 14 App Router와 Tailwind CSS를 사용합니다.

## Tasks

- [ ] 1. 프로젝트 초기 설정
  - [ ] 1.1 Next.js 14 프로젝트 생성
    - create-next-app으로 frontend 디렉토리 생성
    - TypeScript, Tailwind CSS, App Router 설정
    - _Requirements: N/A (Setup)_

  - [ ] 1.2 shadcn/ui 설정
    - shadcn/ui 초기화
    - 기본 컴포넌트 설치 (Button, Card, Input, etc.)
    - _Requirements: N/A (Setup)_

  - [ ] 1.3 디자인 시스템 설정
    - 컬러 팔레트 정의 (globals.css)
    - 폰트 설정 (Pretendard, Geist)
    - _Requirements: 7.1_

  - [ ] 1.4 API 클라이언트 설정
    - lib/api/client.ts 생성
    - 환경 변수 설정 (.env.local)
    - _Requirements: N/A (Setup)_

  - [ ] 1.5 React Query 설정
    - QueryClientProvider 설정
    - 기본 훅 생성
    - _Requirements: N/A (Setup)_

- [ ] 2. Checkpoint - 프로젝트 설정 완료
  - 개발 서버 실행 확인

- [ ] 3. 레이아웃 및 네비게이션
  - [ ] 3.1 루트 레이아웃 구현
    - 사이드바 + 메인 콘텐츠 레이아웃
    - 다크 모드 기본 적용
    - _Requirements: 7.1_

  - [ ] 3.2 사이드바 컴포넌트
    - 로고, 네비게이션 메뉴
    - 프로젝트 선택 드롭다운
    - _Requirements: 1.1_

  - [ ] 3.3 헤더 컴포넌트
    - 페이지 타이틀
    - 알림 아이콘
    - _Requirements: 6.1_

- [ ] 4. 프로젝트 목록 페이지
  - [ ] 4.1 프로젝트 카드 컴포넌트
    - 프로젝트명, 런칭일, 진행률 표시
    - 리스크 레벨 뱃지
    - _Requirements: 1.1, 1.2_

  - [ ] 4.2 프로젝트 목록 페이지
    - 카드 그리드 레이아웃
    - 필터링/정렬 기능
    - _Requirements: 1.1, 1.4_

  - [ ] 4.3 프로젝트 생성 모달/페이지
    - 프로젝트명, 런칭일, 에피소드 수 입력
    - 폼 검증
    - _Requirements: 1.3_

- [ ] 5. Checkpoint - 프로젝트 목록 완료
  - API 연동 테스트

- [ ] 6. 프로젝트 대시보드
  - [ ] 6.1 대시보드 레이아웃
    - 그리드 기반 위젯 배치
    - _Requirements: 2.1_

  - [ ] 6.2 버퍼 상태 카드
    - 7+3 세이프티 가드 시각화
    - 봉인/비축 에피소드 프로그레스 바
    - _Requirements: 2.1_

  - [ ] 6.3 진행률 차트
    - 에피소드별 진행률 바 차트
    - 공정별 breakdown 파이 차트
    - _Requirements: 2.2, 2.3_

  - [ ] 6.4 리스크 분석 카드
    - 리스크 레벨 표시
    - 위험 에피소드 목록
    - _Requirements: 2.4_

  - [ ] 6.5 속도 분석 카드
    - 실제 속도 vs 필요 속도
    - 트렌드 라인 차트
    - _Requirements: 2.5_

  - [ ] 6.6 봉인일 카운트다운
    - D-day 표시
    - 예측 완료일
    - _Requirements: 2.6_

  - [ ] 6.7 건강 점수 카드
    - 점수 게이지
    - 권장 조치 목록
    - _Requirements: 2.7_

- [ ] 7. Checkpoint - 대시보드 완료
  - 모든 위젯 데이터 연동 확인

- [ ] 8. 에피소드 관리
  - [ ] 8.1 에피소드 목록 컴포넌트
    - 테이블 형태 목록
    - 상태별 필터링
    - _Requirements: 3.1_

  - [ ] 8.2 에피소드 상세 페이지
    - 5개 페이지 현황 표시
    - 워크플로우 보드
    - _Requirements: 3.2, 3.3_

- [ ] 9. 워크플로우 보드
  - [ ] 9.1 페이지 카드 컴포넌트
    - 4개 공정 상태 표시
    - 상태별 색상 구분
    - _Requirements: 4.1_

  - [ ] 9.2 작업 시작/완료 버튼
    - 상태에 따른 버튼 활성화/비활성화
    - 로딩 상태 표시
    - _Requirements: 4.2, 4.3_

  - [ ] 9.3 의존성 시각화
    - 잠금 해제 애니메이션
    - 다음 공정 하이라이트
    - _Requirements: 4.4_

  - [ ] 9.4 실시간 업데이트
    - React Query 자동 갱신
    - 낙관적 업데이트
    - _Requirements: 4.5_

- [ ] 10. Checkpoint - 워크플로우 완료
  - 상태 전이 테스트

- [ ] 11. 마일스톤 페이지
  - [ ] 11.1 마일스톤 타임라인
    - 수직 타임라인 레이아웃
    - 완료/미완료 구분
    - _Requirements: 5.1, 5.2_

  - [ ] 11.2 다가오는 마일스톤 알림
    - 7일 이내 마일스톤 하이라이트
    - _Requirements: 5.3_

- [ ] 12. 알림 시스템
  - [ ] 12.1 알림 목록 페이지
    - 알림 카드 목록
    - 날짜별 그룹핑
    - _Requirements: 6.1_

  - [ ] 12.2 알림 심각도 표시
    - INFO/WARNING/CRITICAL 색상 구분
    - 아이콘 표시
    - _Requirements: 6.2_

  - [ ] 12.3 알림 확인 처리
    - 확인 버튼
    - 읽음 상태 표시
    - _Requirements: 6.3_

- [ ] 13. Checkpoint - 알림 시스템 완료
  - 알림 기능 테스트

- [ ] 14. 반응형 디자인
  - [ ] 14.1 태블릿 레이아웃
    - 사이드바 접기
    - 그리드 조정
    - _Requirements: 7.2_

  - [ ] 14.2 모바일 레이아웃
    - 하단 네비게이션
    - 카드 스택 레이아웃
    - _Requirements: 7.3_

- [ ] 15. Final checkpoint - 프론트엔드 완료
  - 전체 기능 테스트
  - 반응형 테스트

## Notes

- 백엔드 API는 http://localhost:3000/api에서 실행 중이라고 가정
- 개발 중 CORS 설정 필요
- 다크 모드 기본, 라이트 모드는 추후 지원

## Progress Summary

| 구분 | 완료 | 미완료 | 진행률 |
|------|------|--------|--------|
| 초기 설정 | 0/5 | 5 | 0% |
| 레이아웃 | 0/3 | 3 | 0% |
| 프로젝트 목록 | 0/3 | 3 | 0% |
| 대시보드 | 0/7 | 7 | 0% |
| 에피소드 | 0/2 | 2 | 0% |
| 워크플로우 | 0/4 | 4 | 0% |
| 마일스톤 | 0/2 | 2 | 0% |
| 알림 | 0/3 | 3 | 0% |
| 반응형 | 0/2 | 2 | 0% |

**다음 작업**: Task 1.1 Next.js 14 프로젝트 생성
