---
inclusion: fileMatch
fileMatchPattern: "**/*.ts"
---

# 강화된 보안 패턴 가이드

TypeScript 파일 작업 시 자동으로 적용되는 강화된 보안 가이드라인입니다.

## 감지 패턴 (9가지 + 확장)

### 🔴 높은 위험도

#### 1. Command Injection (child_process)
**키워드**: `exec(`, `execSync(`, `child_process`

```typescript
// ❌ 위험
import { exec } from 'child_process';
exec(`command ${userInput}`);

// ✅ 안전
import { execFile } from 'child_process';
execFile('command', [userInput]);
```

**체크리스트**:
- [ ] execFile 사용 (exec 대신)
- [ ] 사용자 입력 직접 사용 금지
- [ ] 화이트리스트 기반 명령어 검증

#### 2. Code Injection (eval/Function)
**키워드**: `eval(`, `new Function`

```typescript
// ❌ 위험
eval(userInput);
new Function(userInput)();

// ✅ 안전
JSON.parse(userInput); // 데이터 파싱용
```

**체크리스트**:
- [ ] eval 사용 금지
- [ ] new Function 사용 금지
- [ ] JSON.parse로 데이터 파싱

#### 3. SQL Injection
**키워드**: `.query(`, `raw:`, `createQueryBuilder`

```typescript
// ❌ 위험
repository.query(`SELECT * FROM users WHERE id = ${id}`);

// ✅ 안전
repository.findOne({ where: { id } });
repository.query('SELECT * FROM users WHERE id = $1', [id]);
```

**체크리스트**:
- [ ] TypeORM 메서드 사용
- [ ] Raw 쿼리 시 파라미터 바인딩
- [ ] 사용자 입력 직접 쿼리 삽입 금지

---

### 🟡 중간 위험도

#### 4. XSS (Cross-Site Scripting)
**키워드**: `innerHTML`, `dangerouslySetInnerHTML`, `document.write`

```typescript
// ❌ 위험
element.innerHTML = userInput;

// ✅ 안전
element.textContent = userInput;
// 또는 DOMPurify 사용
element.innerHTML = DOMPurify.sanitize(userInput);
```

#### 5. 민감 데이터 노출
**키워드**: `console.log`, `logger.debug`, `JSON.stringify`

```typescript
// ❌ 위험
console.log('User data:', user);
this.logger.debug(`Password: ${password}`);

// ✅ 안전
this.logger.log(`User ${user.id} logged in`);
// 민감 필드 마스킹
const safeUser = { ...user, password: '***' };
```

#### 6. 환경변수 직접 접근
**키워드**: `process.env.`

```typescript
// ❌ 권장하지 않음
const secret = process.env.JWT_SECRET;

// ✅ 권장
// NestJS ConfigService 사용
const secret = this.configService.get<string>('JWT_SECRET');
```

---

### 🟢 낮은 위험도 (주의 필요)

#### 7. 파일 경로 조작
**키워드**: `path.join`, `fs.readFile`, `../`

```typescript
// ❌ 위험
const filePath = path.join(baseDir, userInput);

// ✅ 안전
const safePath = path.normalize(userInput).replace(/^(\.\.(\/|\\|$))+/, '');
const filePath = path.join(baseDir, safePath);
```

#### 8. 정규식 DoS (ReDoS)
**키워드**: `new RegExp`, `/.*+/`, `/(.+)+/`

```typescript
// ❌ 위험 (백트래킹 폭발)
const regex = new RegExp(`(${userInput})+`);

// ✅ 안전
// 입력 길이 제한 및 이스케이프
const escaped = userInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
```

#### 9. 타이밍 공격
**키워드**: `===` (비밀번호/토큰 비교 시)

```typescript
// ❌ 위험
if (token === expectedToken) { ... }

// ✅ 안전
import { timingSafeEqual } from 'crypto';
const isValid = timingSafeEqual(
  Buffer.from(token),
  Buffer.from(expectedToken)
);
```

---

## WPAIS 프로젝트 특화 규칙

### 웹툰 제작 데이터 보호
- 작가 개인정보: 암호화 저장 필수
- 작품 데이터: 접근 권한 검증
- 결제/정산: 별도 보안 처리

### API 보안
- 모든 엔드포인트: 인증 필수 (공개 API 제외)
- Rate Limiting: 적용 필수
- 요청 검증: ValidationPipe 사용

### 데이터베이스
- TypeORM 메서드 우선 사용
- Raw 쿼리 최소화
- 트랜잭션 적절히 사용

---

## 자동 경고 메시지

보안 관련 코드 작성 시:
```
🔒 보안 체크: [패턴명]
- 위험: [설명]
- 권장: [대안]
- 참조: security-enhanced.md
```
