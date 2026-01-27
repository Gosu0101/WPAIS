# Design: Frontend Dashboard

## Overview

WPAIS 프론트엔드 대시보드의 기술 설계입니다. Next.js 14 App Router와 Tailwind CSS를 사용하여 구현합니다.

## Architecture

### 1. 프로젝트 구조

```
frontend/
├── app/
│   ├── layout.tsx              # 루트 레이아웃
│   ├── page.tsx                # 홈 (프로젝트 목록)
│   ├── projects/
│   │   ├── page.tsx            # 프로젝트 목록
│   │   ├── new/
│   │   │   └── page.tsx        # 프로젝트 생성
│   │   └── [id]/
│   │       ├── page.tsx        # 프로젝트 대시보드
│   │       ├── episodes/
│   │       │   └── page.tsx    # 에피소드 목록
│   │       ├── milestones/
│   │       │   └── page.tsx    # 마일스톤
│   │       └── alerts/
│   │           └── page.tsx    # 알림 히스토리
│   └── episodes/
│       └── [id]/
│           └── page.tsx        # 에피소드 상세 (워크플로우)
├── components/
│   ├── ui/                     # shadcn/ui 기반 컴포넌트
│   ├── dashboard/              # 대시보드 전용 컴포넌트
│   ├── workflow/               # 워크플로우 컴포넌트
│   └── charts/                 # 차트 컴포넌트
├── lib/
│   ├── api/                    # API 클라이언트
│   ├── hooks/                  # 커스텀 훅
│   └── utils/                  # 유틸리티
├── types/                      # TypeScript 타입
└── styles/
    └── globals.css             # 글로벌 스타일
```

### 2. 기술 스택

| 영역 | 기술 | 버전 |
|------|------|------|
| Framework | Next.js | 14.x |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 3.x |
| State | TanStack Query | 5.x |
| Charts | Recharts | 2.x |
| UI | shadcn/ui | latest |
| Icons | Lucide React | latest |
| Date | date-fns | 3.x |

### 3. API 클라이언트 설계

```typescript
// lib/api/client.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const apiClient = {
  projects: {
    list: () => fetch(`${API_BASE_URL}/projects`),
    get: (id: string) => fetch(`${API_BASE_URL}/projects/${id}`),
    create: (data: CreateProjectDto) => fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    update: (id: string, data: UpdateProjectDto) => fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  },
  episodes: {
    list: (projectId: string) => fetch(`${API_BASE_URL}/projects/${projectId}/episodes`),
    get: (id: string) => fetch(`${API_BASE_URL}/episodes/${id}`),
  },
  pages: {
    get: (id: string) => fetch(`${API_BASE_URL}/pages/${id}`),
    startTask: (pageId: string, taskType: string) => fetch(
      `${API_BASE_URL}/pages/${pageId}/tasks/${taskType}/start`,
      { method: 'POST' }
    ),
    completeTask: (pageId: string, taskType: string) => fetch(
      `${API_BASE_URL}/pages/${pageId}/tasks/${taskType}/complete`,
      { method: 'POST' }
    ),
  },
  monitor: {
    dashboard: (projectId: string) => fetch(`${API_BASE_URL}/projects/${projectId}/dashboard`),
    bufferStatus: (projectId: string) => fetch(`${API_BASE_URL}/projects/${projectId}/buffer-status`),
    risk: (projectId: string) => fetch(`${API_BASE_URL}/projects/${projectId}/risk`),
    velocity: (projectId: string) => fetch(`${API_BASE_URL}/projects/${projectId}/velocity`),
    health: (projectId: string) => fetch(`${API_BASE_URL}/projects/${projectId}/health`),
    alerts: (projectId: string) => fetch(`${API_BASE_URL}/projects/${projectId}/alerts`),
  },
  milestones: {
    list: (projectId: string) => fetch(`${API_BASE_URL}/projects/${projectId}/milestones`),
  },
};
```

### 4. 주요 컴포넌트 설계

#### 4.1 BufferStatusCard
```typescript
interface BufferStatusCardProps {
  sealedCount: number;      // 봉인된 에피소드 수 (목표: 7)
  reserveCount: number;     // 비축 에피소드 수 (목표: 3)
  totalRequired: number;    // 총 필요 에피소드 (10)
}
```

#### 4.2 ProgressChart
```typescript
interface ProgressChartProps {
  episodes: {
    number: number;
    progress: number;
    status: 'COMPLETED' | 'IN_PROGRESS' | 'NOT_STARTED';
  }[];
}
```

#### 4.3 WorkflowBoard
```typescript
interface WorkflowBoardProps {
  pages: {
    id: string;
    pageNumber: number;
    backgroundStatus: TaskStatus;
    lineArtStatus: TaskStatus;
    coloringStatus: TaskStatus;
    postProcessingStatus: TaskStatus;
  }[];
  onStartTask: (pageId: string, taskType: TaskType) => void;
  onCompleteTask: (pageId: string, taskType: TaskType) => void;
}
```

#### 4.4 RiskIndicator
```typescript
interface RiskIndicatorProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message?: string;
}
```

### 5. 디자인 시스템

#### 5.1 컬러 팔레트
```css
:root {
  /* 다크 모드 (기본) */
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  --card: 0 0% 7%;
  --card-foreground: 0 0% 98%;
  --primary: 142.1 76.2% 36.3%;      /* 그린 - 진행/완료 */
  --secondary: 240 3.7% 15.9%;
  --muted: 240 3.7% 15.9%;
  --accent: 240 3.7% 15.9%;
  --destructive: 0 84.2% 60.2%;      /* 레드 - 위험/에러 */
  --warning: 38 92% 50%;             /* 오렌지 - 경고 */
  --info: 217.2 91.2% 59.8%;         /* 블루 - 정보 */
  
  /* 상태 색상 */
  --status-locked: 240 5% 34%;
  --status-ready: 217.2 91.2% 59.8%;
  --status-in-progress: 38 92% 50%;
  --status-done: 142.1 76.2% 36.3%;
}
```

#### 5.2 타이포그래피
```css
:root {
  --font-sans: 'Pretendard Variable', 'Geist', sans-serif;
  --font-mono: 'Geist Mono', monospace;
}
```

### 6. 상태 관리

#### React Query 설정
```typescript
// lib/hooks/useProject.ts
export function useProject(id: string) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => apiClient.projects.get(id).then(res => res.json()),
    staleTime: 30 * 1000, // 30초
  });
}

export function useDashboard(projectId: string) {
  return useQuery({
    queryKey: ['dashboard', projectId],
    queryFn: () => apiClient.monitor.dashboard(projectId).then(res => res.json()),
    refetchInterval: 60 * 1000, // 1분마다 자동 갱신
  });
}
```

## Correctness Properties

### Property 1: Data Consistency
- API 응답과 UI 표시 데이터 일치
- 낙관적 업데이트 후 서버 응답으로 동기화

### Property 2: State Transition Validity
- 워크플로우 버튼은 유효한 상태에서만 활성화
- LOCKED 상태에서는 시작 버튼 비활성화

### Property 3: Real-time Updates
- 작업 완료 시 관련 컴포넌트 자동 갱신
- 대시보드 데이터 주기적 폴링

## Test Strategy

- 단위 테스트: Jest + React Testing Library
- E2E 테스트: Playwright
- 스토리북: 컴포넌트 문서화 및 시각적 테스트
