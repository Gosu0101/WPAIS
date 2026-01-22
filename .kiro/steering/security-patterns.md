---
inclusion: fileMatch
fileMatchPattern: "**/*.ts"
---

# 보안 패턴 가이드

TypeScript 파일 작업 시 자동으로 적용되는 보안 가이드라인입니다.

## 감지 패턴 (9가지)

아래 키워드가 포함된 코드 작성 시 해당 보안 체크리스트를 확인하세요.

### 1. 인증/인가 (auth, login, password, token, jwt, session)
- [ ] 비밀번호는 반드시 해시 처리 (bcrypt, argon2)
- [ ] JWT 토큰 만료 시간 설정
- [ ] 세션 타임아웃 구현
- [ ] 권한 검증 미들웨어 적용

### 2. 암호화 (encrypt, decrypt, hash, crypto, secret)
- [ ] 안전한 암호화 알고리즘 사용 (AES-256, RSA-2048+)
- [ ] 키 관리 정책 준수
- [ ] 솔트(salt) 사용
- [ ] 하드코딩된 키/시크릿 금지

### 3. 입력 검증 (validate, sanitize, escape, input)
- [ ] 모든 사용자 입력 검증
- [ ] class-validator 데코레이터 활용
- [ ] XSS 방지를 위한 이스케이프 처리
- [ ] 화이트리스트 기반 검증 선호

### 4. SQL/DB (query, sql, database, execute, repository)
- [ ] 파라미터화된 쿼리 사용 (TypeORM 권장)
- [ ] Raw 쿼리 사용 시 파라미터 바인딩 필수
- [ ] DB 연결 정보 환경변수로 관리
- [ ] 최소 권한 원칙 적용

### 5. 파일 처리 (file, upload, download, path, stream)
- [ ] 파일 확장자 화이트리스트 검증
- [ ] 파일 크기 제한
- [ ] 경로 순회 공격 방지 (../ 차단)
- [ ] 업로드 디렉토리 실행 권한 제거

### 6. 네트워크 (http, request, fetch, api, cors, axios)
- [ ] HTTPS 강제
- [ ] CORS 설정 최소화
- [ ] Rate limiting 적용
- [ ] 타임아웃 설정

### 7. 환경 변수 (env, config, secret, key, credential)
- [ ] .env 파일 .gitignore에 포함
- [ ] 프로덕션 시크릿 별도 관리
- [ ] 환경별 설정 분리
- [ ] 민감 정보 로깅 금지

### 8. 로깅 (log, audit, trace, debug, logger)
- [ ] 민감 데이터 마스킹 (비밀번호, 토큰, 개인정보)
- [ ] 로그 레벨 적절히 설정
- [ ] 프로덕션에서 debug 로그 비활성화
- [ ] 감사 로그 별도 관리

### 9. 에러 처리 (error, exception, catch, throw)
- [ ] 내부 에러 정보 클라이언트 노출 금지
- [ ] 일관된 에러 응답 형식
- [ ] 예외 로깅
- [ ] 적절한 HTTP 상태 코드 반환

## WPAIS 프로젝트 특화 규칙

### 웹툰 제작 데이터 보호
- 작가 개인정보 암호화 저장
- 작품 데이터 접근 권한 검증
- 결제/정산 정보 별도 보안 처리

### API 보안
- 모든 엔드포인트 인증 필수 (공개 API 제외)
- API 키 로테이션 정책
- 요청 검증 파이프 적용

## 코드 예시

### ✅ 좋은 예시
```typescript
// 파라미터화된 쿼리
const user = await this.userRepository.findOne({ where: { id } });

// 입력 검증
@IsString()
@MinLength(8)
password: string;

// 환경 변수 사용
const secret = this.configService.get<string>('JWT_SECRET');
```

### ❌ 나쁜 예시
```typescript
// SQL 인젝션 취약
const user = await this.userRepository.query(`SELECT * FROM users WHERE id = ${id}`);

// 하드코딩된 시크릿
const secret = 'my-super-secret-key';

// 민감 정보 로깅
this.logger.log(`User password: ${password}`);
```
