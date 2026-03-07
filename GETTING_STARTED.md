# WPAIS 실행 가이드

웹툰 제작 AI 지원 시스템(WPAIS)의 실행 및 테스트 방법입니다.

## 📋 사전 요구사항

- Node.js 18+ 
- PostgreSQL 15+
- npm 또는 yarn

## 🗄️ 1. PostgreSQL 데이터베이스 설정

### 1.1 PostgreSQL 설치 확인
```bash
psql --version
```

### 1.2 데이터베이스 생성
```sql
-- PostgreSQL에 접속
psql -U postgres

-- 데이터베이스 생성
CREATE DATABASE wpais_db;

-- 확인
\l
```

### 1.3 환경 변수 설정
프로젝트 루트의 `.env` 파일을 확인/수정:
```env
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password
DATABASE_NAME=wpais_db
```

---

## 🖥️ 2. 백엔드 실행 (NestJS)

### 2.1 의존성 설치
```bash
# 프로젝트 루트에서
npm install
```

### 2.2 마이그레이션 실행
```bash
# 데이터베이스 테이블 생성
npm run migration:run
```

### 2.3 개발 서버 실행
```bash
npm run start:dev
```

현재 기본 설정 기준으로 서버는 `http://localhost:3001`에서 실행됩니다.

### 2.4 API 문서 확인
브라우저에서 Swagger 문서 확인:
```
http://localhost:3001/api/docs
```

### 2.5 헬스체크
```bash
curl http://localhost:3001/api/health
```

---

## 🎨 3. 프론트엔드 실행 (Next.js)

### 3.1 의존성 설치
```bash
cd frontend
npm install
```

### 3.2 환경 변수 확인
`frontend/.env.local` 파일:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

### 3.3 개발 서버 실행
```bash
npm run dev
```

현재 로컬 기본 조합은 다음과 같습니다.

- 프런트엔드: `http://localhost:3000`
- 백엔드 API: `http://localhost:3001/api`

프런트 보호 라우트는 서버 미들웨어에서 `GET /api/auth/session`으로 세션을 먼저 확인합니다.

### 3.4 프로덕션 빌드
```bash
npm run build
npm run start
```

---

## 🧪 4. 테스트 실행

### 4.1 백엔드 단위 테스트
```bash
# 프로젝트 루트에서
npm test
```

### 4.2 특정 테스트 파일 실행
```bash
# 스케줄링 엔진 테스트
npm test -- scheduler.service.spec

# 워크플로우 엔진 테스트
npm test -- workflow-engine.service.spec

# 통합 테스트
npm test -- integration

# 인증/권한 경계 E2E
npm test -- auth-permissions.e2e-spec.ts
```

### 4.3 테스트 커버리지
```bash
npm run test:cov
```

---

## 🔧 5. API 수동 테스트

### 5.1 회원가입
```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tester@example.com",
    "password": "Password1",
    "name": "Tester"
  }'
```

### 5.2 로그인
```bash
curl -i -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "tester@example.com",
    "password": "Password1"
  }'
```

주의:

- 로그인 응답에서는 access token을 받고, `refreshToken`은 HttpOnly 쿠키로 내려옵니다.
- 브라우저 기반 화면 보호는 이 refresh cookie를 사용해 `/api/auth/session`을 확인합니다.

### 5.3 프로젝트 생성
```bash
curl -X POST http://localhost:3001/api/projects \
  -H "Authorization: Bearer {access-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "테스트 웹툰",
    "launchDate": "2026-06-01",
    "episodeCount": 10
  }'
```

### 5.4 프로젝트 목록 조회
```bash
curl -H "Authorization: Bearer {access-token}" \
  http://localhost:3001/api/projects
```

### 5.5 프로젝트 상세 조회
```bash
curl -H "Authorization: Bearer {access-token}" \
  http://localhost:3001/api/projects/{project-id}
```

### 5.6 에피소드 목록 조회
```bash
curl -H "Authorization: Bearer {access-token}" \
  http://localhost:3001/api/projects/{project-id}/episodes
```

### 5.7 대시보드 데이터 조회
```bash
curl -H "Authorization: Bearer {access-token}" \
  http://localhost:3001/api/projects/{project-id}/dashboard
```

### 5.8 작업 시작
```bash
curl -X POST http://localhost:3001/api/pages/{page-id}/tasks/BACKGROUND/start \
  -H "Authorization: Bearer {access-token}"
```

### 5.9 작업 완료
```bash
curl -X POST http://localhost:3001/api/pages/{page-id}/tasks/BACKGROUND/complete \
  -H "Authorization: Bearer {access-token}"
```

---

## 📱 6. 프론트엔드 수동 테스트

### 6.1 주요 페이지

| 페이지 | URL | 설명 |
|--------|-----|------|
| 홈 | http://localhost:3000 | 프로젝트 목록 |
| 프로젝트 목록 | http://localhost:3000/projects | 전체 프로젝트 |
| 프로젝트 생성 | http://localhost:3000/projects/new | 새 프로젝트 |
| 프로젝트 대시보드 | http://localhost:3000/projects/{id} | 상세 대시보드 |
| 에피소드 목록 | http://localhost:3000/projects/{id}/episodes | 에피소드 관리 |
| 에피소드 상세 | http://localhost:3000/episodes/{id} | 워크플로우 보드 |
| 마일스톤 | http://localhost:3000/projects/{id}/milestones | 타임라인 |
| 알림 | http://localhost:3000/projects/{id}/alerts | 알림 히스토리 |

### 6.2 테스트 시나리오

1. **프로젝트 생성 테스트**
   - `/projects/new` 접속
   - 프로젝트명, 런칭일, 에피소드 수 입력
   - 생성 버튼 클릭
   - 대시보드로 리다이렉트 확인

2. **워크플로우 테스트**
   - 프로젝트 대시보드에서 에피소드 클릭
   - 에피소드 상세 페이지에서 페이지 선택
   - 배경 작업 "시작" 버튼 클릭
   - 배경 작업 "완료" 버튼 클릭
   - 선화 작업이 잠금 해제되는지 확인

3. **반응형 테스트**
   - 브라우저 개발자 도구 (F12)
   - 디바이스 모드 토글
   - 모바일/태블릿/데스크톱 레이아웃 확인

---

## 🐛 7. 문제 해결

### PostgreSQL 연결 실패
```bash
# PostgreSQL 서비스 상태 확인
pg_isready -h localhost -p 5432

# 서비스 시작 (Windows)
net start postgresql-x64-15

# 서비스 시작 (Linux/Mac)
sudo systemctl start postgresql
```

### 포트 충돌
```bash
# 3001 포트 사용 중인 프로세스 확인 (Windows)
netstat -ano | findstr :3001

# 프로세스 종료
taskkill /PID {PID} /F
```

### 마이그레이션 오류
```bash
# 마이그레이션 상태 확인
npm run migration:show

# 마이그레이션 되돌리기
npm run migration:revert
```

### WSL에서 테스트가 깨질 때
증상:

- `sqlite3 ... invalid ELF header`
- Jest E2E에서 SQLite 초기화 실패

해결:

```bash
npm rebuild sqlite3
```

WSL에서 Windows용 `node_modules` 바이너리가 섞이면 자주 발생합니다.

---

## 📊 8. 주요 API 엔드포인트

| Method | Endpoint | 설명 |
|--------|----------|------|
| GET | /api/health | 헬스체크 |
| GET | /api/auth/session | refresh cookie 기반 세션 확인 |
| POST | /api/projects | 프로젝트 생성 |
| GET | /api/projects | 프로젝트 목록 |
| GET | /api/projects/:id | 프로젝트 상세 |
| PATCH | /api/projects/:id | 프로젝트 수정 |
| GET | /api/projects/:id/episodes | 에피소드 목록 |
| GET | /api/episodes/:id | 에피소드 상세 |
| GET | /api/pages/:id | 페이지 상세 |
| POST | /api/pages/:id/tasks/:type/start | 작업 시작 |
| POST | /api/pages/:id/tasks/:type/complete | 작업 완료 |
| GET | /api/projects/:id/dashboard | 대시보드 |
| GET | /api/projects/:id/buffer-status | 버퍼 상태 |
| GET | /api/projects/:id/risk | 리스크 분석 |
| GET | /api/projects/:id/velocity | 속도 분석 |
| GET | /api/projects/:id/health | 건강 점수 |
| GET | /api/projects/:id/alerts | 알림 목록 |
| GET | /api/projects/:id/milestones | 마일스톤 |

---

## 🚀 Quick Start (요약)

```bash
# 1. 백엔드 실행
npm install
npm run migration:run
npm run start:dev

# 2. 프론트엔드 실행 (새 터미널)
cd frontend
npm install
npm run dev

# 3. 브라우저에서 확인
# 프런트엔드: http://localhost:3000
# API 문서: http://localhost:3001/api/docs
```
