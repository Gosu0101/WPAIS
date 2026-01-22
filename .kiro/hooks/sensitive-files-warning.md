---
version: 1.0
event: file-saved
match: "**/.env*|**/credentials*|**/secrets*|**/*.pem|**/*.key"
action: warn
---

# 민감 파일 편집 경고

🔐 **민감한 파일을 편집 중입니다!**

## 확인 사항
- [ ] 이 파일이 `.gitignore`에 포함되어 있나요?
- [ ] 하드코딩된 시크릿이 없나요?
- [ ] 환경변수를 사용하고 있나요?

## 보안 체크리스트

### .env 파일
```bash
# ✅ 좋은 예시
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# ❌ 나쁜 예시 (코드에 직접 작성)
const dbUrl = 'postgresql://user:pass@localhost:5432/db';
```

### .gitignore 확인
```
.env
.env.local
.env.*.local
*.pem
*.key
credentials.json
```

### 시크릿 관리 권장
- 개발: `.env.example` 템플릿 제공
- 프로덕션: AWS Secrets Manager, Vault 등 사용
