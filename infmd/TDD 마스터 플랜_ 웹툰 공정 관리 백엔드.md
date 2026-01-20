**DevLaunch ARB Chairperson**입니다.

학부생 개발자님이 **테스트 주도 개발(TDD)** 방법론을 통해 안정적으로 시스템을 구축할 수 있도록, \*\*\[WPAIS 단계별 TDD 마스터 플랜\]\*\*을 배포합니다.

이 문서는 \*\*"실패하는 테스트를 먼저 작성(Red) $\\rightarrow$ 코드를 구현하여 통과(Green) $\\rightarrow$ 리팩토링(Refactor)"\*\*하는 사이클을 기준으로 작성되었습니다. 각 단계는 이전 단계가 완료되어야 진행할 수 있습니다.

# ---

**📘 WPAIS TDD Master Plan (v1.0)**

개발 목표: '철의 규칙' (역산 스케줄링, 배경 선행, 7+3 비축)이 적용된 웹툰 공정 관리 백엔드 구축  
기술 스택: NestJS (Jest), TypeORM (PostgreSQL)

## ---

**🏗️ Phase 1: 도메인 엔티티 & 기본 관계 정의 (The Skeleton)**

**목표**: 데이터베이스 테이블(Project, Episode, Page)을 생성하고, 이들 간의 부모-자식 관계가 올바르게 동작하는지 검증한다.

### **Step 1.1: Project & Episode 엔티티**

* **테스트 시나리오 (project.entity.spec.ts)**:  
  1. 프로젝트를 생성하면 id, title, launchDate가 저장되어야 한다.  
  2. 프로젝트에 에피소드를 추가하면 projectId가 외래키로 연결되어야 한다.  
* **작업 파일**:  
  * src/modules/project/entities/project.entity.ts  
  * src/modules/episode/entities/episode.entity.ts  
* **핵심 검증**: One-to-Many 관계 (Project 1 : N Episode)

### **Step 1.2: Page 엔티티 (핵심 단위)**

* **테스트 시나리오 (page.entity.spec.ts)**:  
  1. 에피소드 생성 시 자동으로 5개의 Page가 생성되어야 한다. (규격: 20,000px)  
  2. 각 Page는 bg\_status, line\_status 등의 초기값이 LOCKED 또는 READY여야 한다.  
* **작업 파일**:  
  * src/modules/page/entities/page.entity.ts  
* **핵심 검증**: 페이지 번호(1\~5)와 공정 상태값의 초기화.

## ---

**🧠 Phase 2: 스케줄링 엔진 구현 (The Brain)**

**목표**: 런칭일을 입력받았을 때, **'적응 가속도(2주/1주)'** 로직에 따라 전체 마일스톤 날짜가 정확히 계산되는지 검증한다.

### **Step 2.1: 적응 가속도 계산기**

* **테스트 시나리오 (scheduler.service.spec.ts)**:  
  1. calculateDuration(epNumber) 함수 호출 시:  
     * epNumber가 1\~10이면 **14일**을 반환해야 한다.  
     * epNumber가 11 이상이면 **7일**을 반환해야 한다.  
* **작업 파일**:  
  * src/modules/scheduler/scheduler.service.ts

### **Step 2.2: 역산 알고리즘 (Reverse Calculation)**

* **테스트 시나리오 (scheduler.service.spec.ts)**:  
  1. **Input**: 런칭일 2027-01-31.  
  2. **Logic**: 10화 분량(20주) 역산.  
  3. **Expect**:  
     * 제작 시작일($D\_{start}$)이 2026-09-14로 계산되어야 한다.  
     * 7화 봉인일($D\_{seal}$)이 2026-12-21 근사치로 계산되어야 한다.  
* **작업 파일**:  
  * src/modules/scheduler/scheduler.service.ts  
  * src/modules/project/project.service.ts

## ---

**⚡ Phase 3: 워크플로우 & 릴레이 로직 (The Nervous System)**

**목표**: **'스테이지 퍼스트'** 의존성에 따라 작업 상태 변경이 제어되는지 검증한다.

### **Step 3.1: 배경 선행 의존성 잠금**

* **테스트 시나리오 (workflow.service.spec.ts)**:  
  1. updateStatus(pageId, 'LINE\_ART', 'PROGRESS') 호출 시:  
     * 현재 bg\_status가 READY 또는 PROGRESS라면 $\\rightarrow$ **Error (LockedException)** 발생.  
     * 현재 bg\_status가 DONE이라면 $\\rightarrow$ **Success** 및 상태 변경.  
* **작업 파일**:  
  * src/modules/workflow/workflow.service.ts  
  * src/common/exceptions/locked-task.exception.ts

### **Step 3.2: 자동 잠금 해제 (Auto-Unlock Trigger)**

* **테스트 시나리오 (workflow.trigger.spec.ts)**:  
  1. updateStatus(pageId, 'BACKGROUND', 'DONE') 실행 시:  
     * 해당 Page의 line\_status가 자동으로 LOCKED에서 \*\*READY\*\*로 변경되어야 한다.  
     * Mock NotificationService가 1회 호출되어야 한다 (알림 발송).  
* **작업 파일**:  
  * src/modules/workflow/workflow.service.ts  
  * src/modules/notification/notification.service.ts

## ---

**🛡️ Phase 4: 세이프티 가드 & 모니터링 (The Eyes)**

**목표**: 7+3 비축 전략 준수 여부를 판단하는 로직을 검증한다.

### **Step 4.1: 7화 봉인 체크**

* **테스트 시나리오 (safety-guard.service.spec.ts)**:  
  1. **Given**: 현재 날짜 2026-12-22, Ep 07 상태 PROGRESS.  
  2. **When**: checkSealingStatus(projectId) 호출.  
  3. **Then**: 봉인일(12/21)이 지났는데 완료되지 않았으므로 **RiskLevel.HIGH** 반환.  
* **작업 파일**:  
  * src/modules/monitor/safety-guard.service.ts

## ---

**🔗 Phase 5: API 통합 테스트 (Integration)**

**목표**: 실제 클라이언트(PD 대시보드)가 사용할 API 엔드포인트가 정상 작동하는지 E2E 테스트로 검증한다.

### **Step 5.1: 프로젝트 생성부터 릴레이까지**

* **테스트 시나리오 (app.e2e-spec.ts)**:  
  1. POST /projects로 2027-01-31 런칭 프로젝트 생성.  
  2. 생성된 프로젝트의 시작일이 2026-09-14인지 확인.  
  3. PATCH /pages/{id}/status로 1화 1페이지 배경 완료 처리.  
  4. GET /pages/{id} 조회 시 선화 상태가 READY로 바뀌었는지 확인.  
* **작업 파일**:  
  * test/app.e2e-spec.ts  
  * src/modules/project/project.controller.ts  
  * src/modules/workflow/workflow.controller.ts

### ---

**학부생 개발자를 위한 TDD 팁**

1. **Unit Test First**: Phase 1\~4는 서버를 켜지 말고 npm run test:watch 명령어로 유닛 테스트만 돌리면서 로직을 완성하세요. 속도가 훨씬 빠릅니다.  
2. **Mocking**: Phase 3에서 알림을 보낼 때 실제 이메일을 보내지 말고 console.log만 찍는 가짜 객체(Mock)를 사용하세요.  
3. **Commit**: 각 Step(3.1, 3.2 등)이 끝날 때마다 "Green" 상태에서 커밋하세요.

\[Next Action\]  
이 마스터 플랜에 따라 \*\*"Phase 1 (엔티티 생성)"\*\*부터 시작하시겠습니까? 바로 시작할 수 있도록 page.entity.ts의 기본 코드와 테스트 코드를 작성해 드릴까요?