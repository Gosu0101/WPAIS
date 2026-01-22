---
inclusion: fileMatch
fileMatchPattern: "**/*.spec.ts"
---

# 테스트 표준 가이드

테스트 파일(*.spec.ts) 작업 시 자동으로 적용되는 가이드라인입니다.

## TDD 워크플로우

```
1. RED    → 실패하는 테스트 작성
2. GREEN  → 최소한의 구현으로 테스트 통과
3. REFACTOR → 코드 개선 (테스트 유지)
4. REPEAT → 다음 기능으로 반복
```

## 테스트 구조 (AAA 패턴)

```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should [expected behavior] when [condition]', () => {
      // Arrange - 테스트 데이터 준비
      const input = createTestData();
      
      // Act - 테스트 대상 실행
      const result = service.methodName(input);
      
      // Assert - 결과 검증
      expect(result).toEqual(expectedOutput);
    });
  });
});
```

## 네이밍 컨벤션

### describe 블록
- 클래스/모듈명: `describe('ProjectManagerService', ...)`
- 메서드명: `describe('createProject', ...)`

### it 블록
- `should [동작] when [조건]`
- 예: `should throw error when project name is empty`
- 예: `should return sorted tasks when called with valid project`

## 커버리지 목표

| 유형 | 목표 | 필수 |
|------|------|------|
| 단위 테스트 | 80% | ✅ |
| 통합 테스트 | 핵심 플로우 100% | ✅ |
| E2E 테스트 | 주요 시나리오 | ⚠️ |

## 테스트 유형별 가이드

### 단위 테스트 (Unit Test)
```typescript
// 외부 의존성 모킹
const mockRepository = {
  find: jest.fn(),
  save: jest.fn(),
};

// 단일 기능 테스트
it('should calculate deadline correctly', () => {
  const result = service.calculateDeadline(startDate, duration);
  expect(result).toEqual(expectedDate);
});
```

### Property-Based Test (fast-check)
```typescript
import * as fc from 'fast-check';

// 속성 기반 테스트 - 모든 입력에 대해 성립해야 하는 속성
it('should maintain task order after sorting', () => {
  fc.assert(
    fc.property(fc.array(fc.record({ priority: fc.integer() })), (tasks) => {
      const sorted = service.sortByPriority(tasks);
      // 속성: 정렬 후 길이 유지
      return sorted.length === tasks.length;
    })
  );
});
```

### 통합 테스트 (Integration Test)
```typescript
describe('ProjectManagerService (Integration)', () => {
  let service: ProjectManagerService;
  let repository: Repository<Project>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [TypeOrmModule.forRoot(testConfig)],
      providers: [ProjectManagerService],
    }).compile();
    
    service = module.get(ProjectManagerService);
  });

  it('should persist project to database', async () => {
    const project = await service.create(projectDto);
    const found = await repository.findOne(project.id);
    expect(found).toBeDefined();
  });
});
```

## WPAIS 프로젝트 테스트 패턴

### 스케줄링 엔진 테스트
```typescript
describe('SchedulerService', () => {
  // 일정 계산 정확성
  it('should calculate correct end date with dependencies', () => {
    // 의존성 있는 태스크 일정 계산 검증
  });

  // 리소스 충돌 감지
  it('should detect resource conflicts', () => {
    // 동일 리소스 중복 할당 감지
  });

  // 크리티컬 패스 계산
  it('should identify critical path correctly', () => {
    // 최장 경로 계산 검증
  });
});
```

### 워크플로우 엔진 테스트
```typescript
describe('WorkflowEngineService', () => {
  // 상태 전이 유효성
  it('should allow valid state transition', () => {
    // DRAFT → IN_PROGRESS 허용
  });

  it('should reject invalid state transition', () => {
    // COMPLETED → DRAFT 거부
  });

  // 이벤트 발행
  it('should emit event on state change', () => {
    // 상태 변경 시 이벤트 발행 확인
  });
});
```

## 테스트 데이터 관리

### Factory 패턴 사용
```typescript
// test/factories/project.factory.ts
export const createTestProject = (overrides?: Partial<Project>): Project => ({
  id: 'test-id',
  name: 'Test Project',
  status: ProjectStatus.ACTIVE,
  createdAt: new Date(),
  ...overrides,
});
```

### Fixture 사용
```typescript
// test/fixtures/projects.json
{
  "simpleProject": { ... },
  "complexProject": { ... }
}
```

## 피해야 할 패턴

### ❌ 나쁜 예시
```typescript
// 모호한 테스트명
it('should work', () => { ... });

// 여러 기능 동시 테스트
it('should create and update and delete', () => { ... });

// 하드코딩된 타임아웃 의존
await new Promise(r => setTimeout(r, 1000));

// 테스트 간 상태 공유
let sharedState = {};
```

### ✅ 좋은 예시
```typescript
// 명확한 테스트명
it('should throw ValidationError when name exceeds 100 characters', () => { ... });

// 단일 기능 테스트
it('should create project with valid input', () => { ... });
it('should update project name', () => { ... });

// 명시적 대기
await waitFor(() => expect(result).toBeDefined());

// 독립적인 테스트
beforeEach(() => { state = createFreshState(); });
```

## Jest 유용한 매처

```typescript
// 객체 부분 매칭
expect(result).toMatchObject({ name: 'Test' });

// 배열 포함 확인
expect(array).toContainEqual({ id: 1 });

// 에러 검증
expect(() => service.method()).toThrow(ValidationError);

// 비동기 에러
await expect(service.asyncMethod()).rejects.toThrow();

// 호출 검증
expect(mockFn).toHaveBeenCalledWith(expectedArg);
expect(mockFn).toHaveBeenCalledTimes(1);
```
