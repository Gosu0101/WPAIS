---
version: 1.0
event: file-saved
match: "src/**/*.ts"
---

# 보안 패턴 리마인더

TypeScript 파일 저장 시 보안 관련 키워드가 감지되면 체크리스트를 상기시킵니다.

## 감지 키워드

저장된 파일에서 다음 키워드가 포함되어 있는지 확인하세요:

| 카테고리 | 키워드 |
|---------|--------|
| 인증 | auth, login, password, token, jwt, session |
| 암호화 | encrypt, decrypt, hash, crypto, secret |
| 입력 | validate, sanitize, escape, input |
| DB | query, sql, execute, raw |
| 파일 | file, upload, download, path |
| 네트워크 | http, request, fetch, cors |
| 환경 | env, config, credential |
| 로깅 | log, audit, trace |
| 에러 | error, exception, catch |

## 보안 체크 요청

위 키워드가 감지되면 다음을 확인해주세요:

1. **민감 데이터 노출**: 비밀번호, 토큰, API 키가 로그나 응답에 노출되지 않는지
2. **입력 검증**: 사용자 입력이 적절히 검증되는지
3. **파라미터화 쿼리**: SQL 인젝션 방지를 위해 TypeORM 메서드 사용하는지
4. **환경 변수**: 하드코딩된 시크릿이 없는지
5. **에러 처리**: 내부 에러 정보가 클라이언트에 노출되지 않는지

## 자동 리마인드 메시지

보안 관련 코드 작성 시 간단히 상기시켜주세요:

```
🔒 보안 체크: [감지된 패턴]에 대한 보안 고려사항을 확인했습니다.
```
