---
version: 1.0
event: file-saved
match: "src/**/*.ts"
pattern: (API_KEY|SECRET|TOKEN|PASSWORD|CREDENTIAL)\s*[=:]\s*['"][^'"]+['"]
action: block
---

# 하드코딩된 시크릿 감지

🚨 **하드코딩된 API 키/시크릿이 감지되었습니다!**

## 감지된 패턴
- `API_KEY = 'xxx'`
- `SECRET = "xxx"`
- `TOKEN: 'xxx'`
- `PASSWORD = 'xxx'`
- `CREDENTIAL = "xxx"`

## 즉시 조치 필요
1. 해당 값을 코드에서 제거
2. 환경변수로 대체
3. 이미 커밋된 경우 시크릿 로테이션

## 올바른 방법

### NestJS ConfigService 사용
```typescript
// ❌ 나쁜 예시
const apiKey = 'sk-1234567890abcdef';

// ✅ 좋은 예시
import { ConfigService } from '@nestjs/config';

constructor(private configService: ConfigService) {}

const apiKey = this.configService.get<string>('API_KEY');
```

### .env 파일 사용
```bash
# .env (gitignore에 포함)
API_KEY=sk-1234567890abcdef
JWT_SECRET=your-secret-key
```

### .env.example 템플릿
```bash
# .env.example (커밋 가능)
API_KEY=your-api-key-here
JWT_SECRET=your-jwt-secret-here
```
