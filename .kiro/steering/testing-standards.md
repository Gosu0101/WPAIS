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

## 커버리지 목표

| 유형 | 목표 | 필수 |
|------|------|------|
| 단위 테스트 | 80% | ✅ |
| 통합 테스트 | 핵심 플로우 100% | ✅ |
| E2E 테스트 | 주요 시나리오 | ⚠️ |
