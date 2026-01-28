# Tasks: Calendar View

## Task 1: 프로젝트 설정 및 의존성 설치

- [x] 1.1 FullCalendar 패키지 설치
  - `@fullcalendar/core`, `@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/interaction` 설치
  - package.json 업데이트

- [x] 1.2 캘린더 타입 정의
  - `frontend/src/types/calendar.ts` 생성
  - CalendarEvent, CalendarFilter, CalendarViewType 타입 정의

## Task 2: 백엔드 API 구현

- [x] 2.1 캘린더 DTO 정의
  - `src/api/dto/calendar/` 디렉토리 생성
  - CalendarEventsQueryDto, CalendarEventResponseDto, RescheduleEventDto 정의

- [x] 2.2 CalendarService 구현
  - `src/api/services/calendar.service.ts` 생성
  - 에피소드, 마일스톤, 페이지 데이터를 캘린더 이벤트로 변환
  - 날짜 범위 필터링 로직

- [x] 2.3 CalendarController 구현
  - `src/api/controllers/calendar.controller.ts` 생성
  - GET /api/calendar/events 엔드포인트
  - GET /api/projects/:id/calendar/events 엔드포인트
  - PATCH /api/calendar/events/:id/reschedule 엔드포인트

- [x] 2.4 Property-Based Test: 이벤트 변환 정확성
  - 에피소드/마일스톤/페이지 → CalendarEvent 변환 검증
  - 날짜 범위 필터링 검증

## Task 3: 프론트엔드 API 클라이언트 확장

- [x] 3.1 캘린더 API 클라이언트 추가
  - `frontend/src/lib/api/client.ts`에 calendar 메서드 추가
  - getEvents, getProjectEvents, rescheduleEvent

- [x] 3.2 useCalendar 훅 구현
  - `frontend/src/lib/hooks/use-calendar.ts` 생성
  - useCalendarEvents, useRescheduleEvent 훅

## Task 4: 캘린더 기본 컴포넌트 구현

- [x] 4.1 CalendarView 메인 컴포넌트
  - `frontend/src/components/calendar/calendar-view.tsx` 생성
  - FullCalendar 초기화 및 기본 설정
  - 월간/주간/일간 뷰 지원

- [x] 4.2 CalendarToolbar 컴포넌트
  - `frontend/src/components/calendar/calendar-toolbar.tsx` 생성
  - 뷰 전환 버튼, 네비게이션 버튼, 오늘 버튼

- [x] 4.3 Property-Based Test: 날짜 범위 일관성
  - 표시된 이벤트가 현재 뷰 범위 내에 있는지 검증

## Task 5: 이벤트 표시 및 스타일링

- [x] 5.1 이벤트 색상 유틸리티
  - `frontend/src/lib/utils/calendar-colors.ts` 생성
  - 상태별, 타입별 색상 매핑 함수

- [x] 5.2 커스텀 이벤트 렌더링
  - 에피소드/마일스톤/작업 타입별 이벤트 스타일
  - 상태별 색상 적용
  - 봉인 여부 시각적 표시

- [x] 5.3 Property-Based Test: 상태-색상 매핑
  - 모든 상태에 대해 올바른 색상이 적용되는지 검증

## Task 6: 필터링 기능 구현

- [x] 6.1 CalendarFilters 컴포넌트
  - `frontend/src/components/calendar/calendar-filters.tsx` 생성
  - 이벤트 타입 필터 (에피소드/마일스톤/작업)
  - 상태 필터, 공정 타입 필터

- [x] 6.2 필터 상태 관리 및 URL 동기화
  - URL 쿼리 파라미터로 필터 상태 저장/복원
  - 필터 변경 시 이벤트 리로드

- [x] 6.3 Property-Based Test: 필터 일관성
  - 필터 적용 시 조건을 만족하는 이벤트만 표시되는지 검증

## Task 7: 이벤트 상세 보기

- [x] 7.1 EventPopover 컴포넌트
  - `frontend/src/components/calendar/event-popover.tsx` 생성
  - 이벤트 클릭 시 상세 정보 팝오버
  - 타입별 다른 정보 표시

- [x] 7.2 상세 페이지 네비게이션
  - 에피소드 → /episodes/[id]
  - 마일스톤 → /projects/[id]/milestones
  - 작업 → /episodes/[id] (해당 페이지)

## Task 8: 드래그앤드롭 일정 변경

- [x] 8.1 드래그앤드롭 이벤트 핸들링
  - eventDrop 콜백 구현
  - 낙관적 업데이트 적용

- [x] 8.2 EventEditDialog 컴포넌트
  - `frontend/src/components/calendar/event-edit-dialog.tsx` 생성
  - 변경 확인 다이얼로그
  - 연쇄 변경 경고 표시

- [x] 8.3 변경 취소(Undo) 기능
  - 최근 변경 히스토리 관리
  - Undo 버튼 또는 Ctrl+Z 지원

## Task 9: 다중 프로젝트 통합 캘린더

- [x] 9.1 ProjectSelector 컴포넌트
  - `frontend/src/components/calendar/project-selector.tsx` 생성
  - 프로젝트 목록 표시 및 선택/해제

- [x] 9.2 프로젝트별 색상 할당
  - 프로젝트마다 고유 색상 자동 할당
  - 색상 범례 표시

- [x] 9.3 Property-Based Test: 프로젝트 색상 고유성
  - 모든 프로젝트가 서로 다른 색상을 가지는지 검증

## Task 10: 경고 및 알림 표시

- [x] 10.1 마감 임박/지연 강조 표시
  - 마감 3일 이내 이벤트 강조
  - 지연된 이벤트 경고 스타일

- [x] 10.2 버퍼 부족 경고
  - 버퍼 상태 기반 경고 표시
  - 툴팁으로 상세 정보 제공

- [x] 10.3 Property-Based Test: 경고 정확성
  - 마감 임박/지연 판단 로직 검증

## Task 11: 반응형 디자인

- [x] 11.1 뷰포트별 기본 뷰 설정
  - 데스크톱: 월간 뷰
  - 태블릿: 주간 뷰
  - 모바일: 일간 뷰

- [x] 11.2 모바일 터치 제스처
  - 스와이프로 이전/다음 네비게이션
  - 터치 친화적 이벤트 클릭 영역

## Task 12: 페이지 라우팅 및 통합

- [x] 12.1 통합 캘린더 페이지
  - `frontend/src/app/calendar/page.tsx` 생성
  - 전체 프로젝트 통합 뷰

- [x] 12.2 프로젝트별 캘린더 페이지
  - `frontend/src/app/projects/[id]/calendar/page.tsx` 생성
  - 단일 프로젝트 캘린더 뷰

- [x] 12.3 네비게이션 메뉴 업데이트
  - 사이드바/헤더에 캘린더 링크 추가

## Task 13: 접근성 및 키보드 네비게이션

- [x] 13.1 키보드 네비게이션
  - 화살표 키로 날짜 이동
  - Enter로 이벤트 선택
  - Escape로 팝오버 닫기

- [x] 13.2 스크린 리더 지원
  - 이벤트 aria-label 추가
  - 라이브 리전으로 변경 알림

## Task 14: 테스트 및 문서화

- [x] 14.1 단위 테스트
  - 이벤트 변환 함수 테스트
  - 필터 로직 테스트
  - 색상 할당 테스트

- [x] 14.2 통합 테스트
  - 캘린더 데이터 로딩 테스트
  - 드래그앤드롭 API 호출 테스트

- [x] 14.3 E2E 테스트
  - 뷰 전환 및 네비게이션 테스트
  - 이벤트 클릭 → 상세 페이지 이동 테스트
