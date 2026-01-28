# Design: Calendar View

## Overview

웹툰 제작 일정을 캘린더 형태로 시각화하는 기능의 기술 설계입니다. FullCalendar 라이브러리를 활용하여 월간/주간/일간 뷰와 드래그앤드롭 기능을 구현합니다.

## Architecture

### 1. 기술 스택

| 영역 | 기술 | 버전 | 선정 이유 |
|------|------|------|-----------|
| Calendar | FullCalendar | 6.x | 풍부한 기능, React 지원, 드래그앤드롭 내장 |
| React Adapter | @fullcalendar/react | 6.x | Next.js App Router 호환 |
| Plugins | daygrid, timegrid, interaction | 6.x | 월간/주간/일간 뷰 + 드래그앤드롭 |
| Date | date-fns | 3.x | 기존 프로젝트 일관성 |

### 2. 프로젝트 구조

```
frontend/
├── src/
│   ├── app/
│   │   ├── calendar/
│   │   │   └── page.tsx              # 통합 캘린더 페이지
│   │   └── projects/
│   │       └── [id]/
│   │           └── calendar/
│   │               └── page.tsx      # 프로젝트별 캘린더
│   ├── components/
│   │   └── calendar/
│   │       ├── index.ts
│   │       ├── calendar-view.tsx     # 메인 캘린더 컴포넌트
│   │       ├── calendar-toolbar.tsx  # 커스텀 툴바
│   │       ├── calendar-filters.tsx  # 필터 패널
│   │       ├── event-popover.tsx     # 이벤트 상세 팝오버
│   │       ├── event-edit-dialog.tsx # 이벤트 수정 다이얼로그
│   │       └── project-selector.tsx  # 프로젝트 선택기
│   ├── lib/
│   │   ├── api/
│   │   │   └── client.ts             # 캘린더 API 추가
│   │   └── hooks/
│   │       └── use-calendar.ts       # 캘린더 데이터 훅
│   └── types/
│       └── calendar.ts               # 캘린더 타입 정의
```

### 3. 데이터 모델

#### 3.1 캘린더 이벤트 타입

```typescript
// types/calendar.ts

export type CalendarEventType = 'episode' | 'milestone' | 'task';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end?: Date;
  allDay: boolean;
  type: CalendarEventType;
  projectId: string;
  projectTitle?: string;
  color?: string;
  extendedProps: EpisodeEventProps | MilestoneEventProps | TaskEventProps;
}

export interface EpisodeEventProps {
  type: 'episode';
  episodeNumber: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  isSealed: boolean;
  progress?: number;
}

export interface MilestoneEventProps {
  type: 'milestone';
  milestoneType: string;
  isCompleted: boolean;
  completedAt?: Date;
}

export interface TaskEventProps {
  type: 'task';
  pageId: string;
  pageNumber: number;
  episodeNumber: number;
  taskType: 'BACKGROUND' | 'LINE_ART' | 'COLORING' | 'POST_PROCESSING';
  status: 'LOCKED' | 'READY' | 'IN_PROGRESS' | 'DONE';
}

export interface CalendarFilter {
  eventTypes: CalendarEventType[];
  episodeStatuses: string[];
  taskTypes: string[];
  projectIds: string[];
}

export type CalendarViewType = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
```

### 4. API 설계

#### 4.1 백엔드 엔드포인트

```typescript
// GET /api/calendar/events
// 캘린더 이벤트 조회 (통합)
interface CalendarEventsQuery {
  startDate: string;      // ISO 날짜
  endDate: string;        // ISO 날짜
  projectIds?: string[];  // 프로젝트 필터
  types?: CalendarEventType[];
}

interface CalendarEventsResponse {
  events: CalendarEvent[];
  projects: { id: string; title: string; color: string }[];
}

// GET /api/projects/:id/calendar/events
// 프로젝트별 캘린더 이벤트 조회
interface ProjectCalendarEventsQuery {
  startDate: string;
  endDate: string;
  types?: CalendarEventType[];
}

// PATCH /api/calendar/events/:id/reschedule
// 이벤트 일정 변경
interface RescheduleEventDto {
  newDate: string;
  eventType: CalendarEventType;
}

interface RescheduleEventResponse {
  success: boolean;
  affectedEvents?: CalendarEvent[];  // 연쇄 변경된 이벤트
  warnings?: string[];               // 경고 메시지
}
```

#### 4.2 프론트엔드 API 클라이언트

```typescript
// lib/api/client.ts 확장

export const apiClient = {
  // ... 기존 API
  
  calendar: {
    getEvents: (params: CalendarEventsQuery) => 
      fetch(`${API_BASE_URL}/calendar/events?${new URLSearchParams(params)}`),
    
    getProjectEvents: (projectId: string, params: ProjectCalendarEventsQuery) =>
      fetch(`${API_BASE_URL}/projects/${projectId}/calendar/events?${new URLSearchParams(params)}`),
    
    rescheduleEvent: (eventId: string, data: RescheduleEventDto) =>
      fetch(`${API_BASE_URL}/calendar/events/${eventId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },
};
```

### 5. 컴포넌트 설계

#### 5.1 CalendarView (메인 컴포넌트)

```typescript
// components/calendar/calendar-view.tsx

interface CalendarViewProps {
  projectId?: string;           // 단일 프로젝트 모드
  initialView?: CalendarViewType;
  initialDate?: Date;
  editable?: boolean;           // 드래그앤드롭 허용
  onEventClick?: (event: CalendarEvent) => void;
  onEventDrop?: (event: CalendarEvent, newDate: Date) => void;
}

// FullCalendar 설정
const calendarOptions = {
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin],
  initialView: 'dayGridMonth',
  headerToolbar: false,  // 커스텀 툴바 사용
  editable: true,
  droppable: false,
  eventDrop: handleEventDrop,
  eventClick: handleEventClick,
  datesSet: handleDatesSet,  // 날짜 범위 변경 시 데이터 로드
  locale: 'ko',
  firstDay: 0,  // 일요일 시작
  dayMaxEvents: 3,  // 더보기 표시
  moreLinkClick: 'popover',
};
```

#### 5.2 CalendarToolbar

```typescript
// components/calendar/calendar-toolbar.tsx

interface CalendarToolbarProps {
  currentView: CalendarViewType;
  currentDate: Date;
  onViewChange: (view: CalendarViewType) => void;
  onNavigate: (action: 'prev' | 'next' | 'today') => void;
  onDateChange: (date: Date) => void;
}
```

#### 5.3 CalendarFilters

```typescript
// components/calendar/calendar-filters.tsx

interface CalendarFiltersProps {
  filters: CalendarFilter;
  projects: { id: string; title: string; color: string }[];
  onFilterChange: (filters: CalendarFilter) => void;
}
```

#### 5.4 EventPopover

```typescript
// components/calendar/event-popover.tsx

interface EventPopoverProps {
  event: CalendarEvent;
  onEdit: () => void;
  onNavigate: () => void;  // 상세 페이지 이동
  onClose: () => void;
}
```

### 6. 상태 관리

#### 6.1 React Query 훅

```typescript
// lib/hooks/use-calendar.ts

export function useCalendarEvents(params: {
  startDate: Date;
  endDate: Date;
  projectId?: string;
  filters?: CalendarFilter;
}) {
  return useQuery({
    queryKey: ['calendar-events', params],
    queryFn: () => params.projectId 
      ? apiClient.calendar.getProjectEvents(params.projectId, {
          startDate: params.startDate.toISOString(),
          endDate: params.endDate.toISOString(),
          types: params.filters?.eventTypes,
        })
      : apiClient.calendar.getEvents({
          startDate: params.startDate.toISOString(),
          endDate: params.endDate.toISOString(),
          projectIds: params.filters?.projectIds,
          types: params.filters?.eventTypes,
        }),
    staleTime: 60 * 1000,  // 1분
  });
}

export function useRescheduleEvent() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: RescheduleEventDto }) =>
      apiClient.calendar.rescheduleEvent(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}
```

### 7. 이벤트 색상 체계

```typescript
// lib/utils/calendar-colors.ts

export const EVENT_COLORS = {
  episode: {
    PENDING: '#6b7280',      // gray-500
    IN_PROGRESS: '#f59e0b',  // amber-500
    COMPLETED: '#22c55e',    // green-500
    SEALED: '#8b5cf6',       // violet-500
  },
  milestone: {
    default: '#3b82f6',      // blue-500
    completed: '#22c55e',    // green-500
    overdue: '#ef4444',      // red-500
  },
  task: {
    LOCKED: '#374151',       // gray-700
    READY: '#3b82f6',        // blue-500
    IN_PROGRESS: '#f59e0b',  // amber-500
    DONE: '#22c55e',         // green-500
  },
};

// 프로젝트별 색상 (다중 프로젝트 모드)
export const PROJECT_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16',
  '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6',
  '#6366f1', '#8b5cf6', '#a855f7', '#ec4899',
];
```

### 8. 반응형 설계

```typescript
// 뷰포트별 기본 뷰
const RESPONSIVE_VIEWS = {
  mobile: 'timeGridDay',    // < 640px
  tablet: 'timeGridWeek',   // 640px - 1024px
  desktop: 'dayGridMonth',  // > 1024px
};

// 모바일 터치 제스처
const TOUCH_CONFIG = {
  swipeThreshold: 50,
  swipeDirection: 'horizontal',
  onSwipeLeft: () => navigate('next'),
  onSwipeRight: () => navigate('prev'),
};
```

### 9. 접근성

- 키보드 네비게이션: 화살표 키로 날짜 이동
- 스크린 리더: 이벤트 정보 aria-label 제공
- 고대비 모드: 색상 외 아이콘/패턴으로 구분
- 포커스 관리: 모달/팝오버 포커스 트랩

## Correctness Properties

### Property 1: Date Range Consistency (Validates: 1.1, 1.2, 1.3)
- 캘린더에 표시된 모든 이벤트의 start 날짜는 현재 뷰의 날짜 범위 내에 있어야 함
- `∀ event ∈ displayedEvents: viewStartDate ≤ event.start ≤ viewEndDate`
- 뷰 전환 시 해당 범위의 이벤트만 API에서 로드

### Property 2: Event Type Integrity (Validates: 2.1, 2.2, 3.1, 3.2, 4.1, 4.2, 4.3)
- 각 이벤트는 정확히 하나의 타입(episode/milestone/task)을 가짐
- 타입에 따른 extendedProps 구조가 일치해야 함
- `∀ event: event.type ∈ {'episode', 'milestone', 'task'} ∧ validExtendedProps(event)`

### Property 3: Status-Color Mapping (Validates: 2.2, 3.3, 4.3)
- 이벤트 상태와 색상 매핑이 일관되어야 함
- `∀ episode: episode.status === 'COMPLETED' → episode.color === EVENT_COLORS.episode.COMPLETED`
- `∀ task: task.status === 'IN_PROGRESS' → task.color === EVENT_COLORS.task.IN_PROGRESS`

### Property 4: Filter Consistency (Validates: 5.1, 5.2, 5.3, 5.4)
- 필터 적용 시 해당 조건을 만족하는 이벤트만 표시
- `∀ event ∈ displayedEvents: matchesFilter(event, currentFilter)`
- 복합 필터는 AND 조건으로 적용

### Property 5: Multi-Project Color Uniqueness (Validates: 8.1)
- 통합 캘린더에서 각 프로젝트는 고유한 색상 할당
- `∀ p1, p2 ∈ projects: p1.id ≠ p2.id → p1.color ≠ p2.color`
- 프로젝트 수가 색상 팔레트 초과 시 패턴으로 구분

### Property 6: Deadline Warning Accuracy (Validates: 9.1, 9.2)
- 마감 임박 판단이 정확해야 함
- `∀ event: isUrgent(event) ↔ (event.start - today) ≤ URGENT_THRESHOLD_DAYS`
- 지연 판단: `isOverdue(event) ↔ event.start < today ∧ !event.isCompleted`

## Test Strategy

### Unit Tests
- 이벤트 변환 함수 (API 응답 → FullCalendar 이벤트)
- 필터 로직
- 색상 할당 로직
- 날짜 범위 계산

### Integration Tests
- 캘린더 데이터 로딩 및 표시
- 드래그앤드롭 후 API 호출
- 필터 적용 및 URL 동기화

### E2E Tests
- 뷰 전환 및 네비게이션
- 이벤트 클릭 → 팝오버 → 상세 페이지 이동
- 드래그앤드롭 일정 변경 플로우

## Dependencies

### 신규 패키지
```json
{
  "@fullcalendar/core": "^6.1.0",
  "@fullcalendar/react": "^6.1.0",
  "@fullcalendar/daygrid": "^6.1.0",
  "@fullcalendar/timegrid": "^6.1.0",
  "@fullcalendar/interaction": "^6.1.0"
}
```

### 백엔드 변경
- CalendarController 추가
- CalendarService 추가 (기존 서비스 조합)
- 캘린더 전용 DTO 정의
