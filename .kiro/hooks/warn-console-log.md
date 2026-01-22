---
version: 1.0
event: file-saved
match: "src/**/*.ts"
pattern: console\.(log|debug|info|warn|error)\(
action: warn
---

# Console 사용 경고

🔍 **console.log/debug/info/warn/error 감지**

## 확인 사항
- [ ] 디버깅 목적인가요?
- [ ] 프로덕션에 배포될 코드인가요?
- [ ] 민감한 정보가 출력되지 않나요?

## 권장 대안

### NestJS Logger 사용
```typescript
import { Logger } from '@nestjs/common';

private readonly logger = new Logger(MyService.name);

// 대신 사용
this.logger.log('정보 메시지');
this.logger.debug('디버그 메시지');
this.logger.warn('경고 메시지');
this.logger.error('에러 메시지', error.stack);
```

### 장점
- 로그 레벨 제어 가능
- 타임스탬프 자동 추가
- 컨텍스트(클래스명) 포함
- 프로덕션에서 debug 레벨 비활성화 가능
