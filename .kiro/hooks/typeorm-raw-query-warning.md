---
version: 1.0
event: file-saved
match: "src/**/*.ts"
pattern: \.query\s*\(|\.createQueryBuilder\s*\(.*\.where\s*\(.*\$\{
action: warn
---

# TypeORM Raw Query 경고

⚠️ **Raw Query 또는 동적 쿼리 빌더 감지**

## 확인 사항
- [ ] 파라미터 바인딩을 사용하고 있나요?
- [ ] 사용자 입력이 직접 쿼리에 삽입되지 않나요?
- [ ] TypeORM 메서드로 대체 가능한가요?

## SQL Injection 방지

### ❌ 위험한 패턴
```typescript
// 문자열 보간 사용 - SQL Injection 취약
const result = await this.repository.query(
  `SELECT * FROM users WHERE id = ${userId}`
);

// QueryBuilder에서 동적 값 직접 사용
const result = await this.repository
  .createQueryBuilder('user')
  .where(`user.name = '${userName}'`)
  .getMany();
```

### ✅ 안전한 패턴
```typescript
// 파라미터 바인딩 사용
const result = await this.repository.query(
  'SELECT * FROM users WHERE id = $1',
  [userId]
);

// TypeORM 메서드 사용 (권장)
const result = await this.repository.findOne({
  where: { id: userId }
});

// QueryBuilder 파라미터 사용
const result = await this.repository
  .createQueryBuilder('user')
  .where('user.name = :name', { name: userName })
  .getMany();
```

## WPAIS 프로젝트 규칙
- TypeORM Repository 메서드 우선 사용
- Raw Query는 복잡한 집계/조인에만 사용
- 모든 Raw Query는 파라미터 바인딩 필수
