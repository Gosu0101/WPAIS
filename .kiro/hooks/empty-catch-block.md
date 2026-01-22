---
version: 1.0
event: file-saved
match: "src/**/*.ts"
pattern: catch\s*\([^)]*\)\s*\{\s*\}|catch\s*\{\s*\}
action: block
---

# 빈 Catch 블록 차단

🚨 **빈 catch 블록이 감지되었습니다!**

## 문제점
빈 catch 블록은 에러를 조용히 삼켜버려:
- 디버깅이 불가능해짐
- 문제의 근본 원인을 숨김
- 예상치 못한 동작 유발

## 즉시 수정 필요

### ❌ 금지된 패턴
```typescript
try {
  await riskyOperation();
} catch (error) {
  // 빈 블록 - 절대 금지!
}

try {
  await riskyOperation();
} catch {
  // 이것도 금지!
}
```

### ✅ 올바른 패턴
```typescript
// 1. 에러 로깅
try {
  await riskyOperation();
} catch (error) {
  this.logger.error('Operation failed', error.stack);
  throw error; // 또는 적절히 처리
}

// 2. 에러 변환
try {
  await riskyOperation();
} catch (error) {
  throw new CustomException('Operation failed', error);
}

// 3. 복구 로직
try {
  await riskyOperation();
} catch (error) {
  this.logger.warn('Operation failed, using fallback', error.message);
  return fallbackValue;
}

// 4. 의도적 무시 (명시적 주석 필수)
try {
  await optionalOperation();
} catch (error) {
  // 의도적으로 무시: 이 작업은 실패해도 괜찮음
  // 이유: [구체적인 이유 설명]
  this.logger.debug('Optional operation failed', error.message);
}
```

## Silent Failure 방지 원칙
1. 모든 에러는 로깅되어야 함
2. 사용자에게 적절한 피드백 제공
3. 에러 무시 시 명시적 주석 필수
4. 광범위한 catch 대신 구체적인 에러 타입 처리
