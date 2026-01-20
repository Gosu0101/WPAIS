# Requirements Document

## Introduction

WPAIS(Webtoon Production AI Support System)의 스케줄링 엔진 모듈에 대한 요구사항 문서입니다. 이 모듈은 웹툰 런칭일을 기준으로 역산하여 전체 제작 일정을 자동으로 계산하고, '적응 가속도(Adaptive Learning Curve)' 로직을 통해 초반 회차와 후반 회차의 제작 기간을 차등 적용합니다.

## Glossary

- **Scheduler**: 런칭일을 입력받아 역산 알고리즘을 실행하고 마일스톤을 생성하는 핵심 서비스
- **Project**: 하나의 웹툰 작품을 나타내는 엔티티로, 런칭일과 가중치 설정을 포함
- **Episode**: 프로젝트에 속한 개별 회차로, 회차 번호에 따라 제작 기간이 결정됨
- **Learning_Period**: 1~10화 구간으로, 회차당 2주(14일)의 제작 기간이 할당되는 적응기
- **Normal_Period**: 11화 이후 구간으로, 회차당 1주(7일)의 제작 기간이 할당되는 정상 연재기
- **Seal_Date**: 런칭 1개월 전 7화 원고가 완성되어야 하는 봉인일
- **Launch_Date**: 웹툰이 플랫폼에 공개되는 런칭일
- **Production_Start_Date**: 실제 제작이 시작되는 날짜
- **Velocity_Config**: 회차별 제작 기간 가중치 설정 (JSON 형태)
- **Milestone**: 기획 완료, 채용 완료, 3화/5화/7화 완성 등 주요 체크포인트

## Requirements

### Requirement 1: 프로젝트 생성 및 런칭일 설정

**User Story:** As a PD, I want to create a new webtoon project with a target launch date, so that the system can calculate the entire production schedule automatically.

#### Acceptance Criteria

1. WHEN a PD creates a new project with a launch date, THE Scheduler SHALL calculate and store the seal date as 30 days before the launch date
2. WHEN a project is created, THE Scheduler SHALL calculate the production start date by reverse-calculating from the launch date
3. THE Project SHALL store the launch date, seal date, and velocity configuration in the database
4. WHEN a project is created with 10 episodes for launch, THE Scheduler SHALL calculate a total production period of 20 weeks (10 episodes × 2 weeks each)

### Requirement 2: 적응 가속도 로직 구현

**User Story:** As a PD, I want the system to apply different production durations based on episode numbers, so that early episodes have more time for quality stabilization.

#### Acceptance Criteria

1. WHEN calculating duration for episodes 1 through 10, THE Scheduler SHALL return 14 days per episode
2. WHEN calculating duration for episodes 11 and above, THE Scheduler SHALL return 7 days per episode
3. THE Scheduler SHALL store the velocity configuration as JSON in the format {"1-10": 14, "11+": 7}
4. WHEN an episode is created, THE Episode SHALL automatically receive the correct due date based on its episode number and the velocity configuration

### Requirement 3: 역산 알고리즘 실행

**User Story:** As a PD, I want the system to calculate all milestone dates by working backwards from the launch date, so that I can see when each phase must be completed.

#### Acceptance Criteria

1. WHEN a launch date is provided, THE Scheduler SHALL calculate the production end date as the launch date minus 30 days (seal date)
2. WHEN calculating the production start date, THE Scheduler SHALL subtract the total production duration from the seal date
3. WHEN calculating milestones, THE Scheduler SHALL generate dates for 3-episode, 5-episode, and 7-episode completion checkpoints
4. THE Scheduler SHALL calculate the hiring start date as 5 weeks before the production start date
5. THE Scheduler SHALL calculate the planning start date as 8 weeks before the hiring start date

### Requirement 4: 회차별 마감일 자동 계산

**User Story:** As a PD, I want each episode to have an automatically calculated due date, so that I can track production progress against deadlines.

#### Acceptance Criteria

1. WHEN episodes are generated for a project, THE Scheduler SHALL assign sequential due dates based on the velocity configuration
2. FOR episodes 1 through 10, THE Scheduler SHALL space due dates 14 days apart starting from the production start date
3. FOR episodes 11 and above, THE Scheduler SHALL space due dates 7 days apart from the previous episode's due date
4. WHEN a due date is calculated, THE Episode SHALL store both the calculated due date and the episode number

### Requirement 5: 마일스톤 생성 및 조회

**User Story:** As a PD, I want to view all major milestones for a project, so that I can plan resources and communicate deadlines to the team.

#### Acceptance Criteria

1. WHEN a project is created, THE Scheduler SHALL generate milestones for planning completion, hiring completion, and production start
2. THE Scheduler SHALL generate save-up milestones at 3-episode, 5-episode, and 7-episode completion points
3. WHEN milestones are queried, THE Scheduler SHALL return a list containing milestone name, target date, and completion status
4. THE Scheduler SHALL mark the 7-episode milestone as the seal date milestone

### Requirement 6: 일정 유효성 검증

**User Story:** As a PD, I want the system to validate that the calculated schedule is feasible, so that I can identify potential issues before production starts.

#### Acceptance Criteria

1. WHEN a schedule is calculated, THE Scheduler SHALL verify that the production start date is in the future
2. IF the calculated production start date is in the past, THEN THE Scheduler SHALL return an error indicating insufficient time
3. WHEN validating a schedule, THE Scheduler SHALL check that all milestone dates fall within the valid production period
4. IF any milestone date conflicts with another, THEN THE Scheduler SHALL return a warning with the conflicting dates

### Requirement 7: 일정 재계산

**User Story:** As a PD, I want to recalculate the schedule when the launch date changes, so that all dependent dates are updated automatically.

#### Acceptance Criteria

1. WHEN the launch date is updated, THE Scheduler SHALL recalculate all milestone dates
2. WHEN the launch date is updated, THE Scheduler SHALL recalculate all episode due dates
3. WHEN recalculating, THE Scheduler SHALL preserve the velocity configuration unless explicitly changed
4. WHEN recalculation is complete, THE Scheduler SHALL return the updated schedule with all new dates
