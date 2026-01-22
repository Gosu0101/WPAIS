---
version: 1.0
event: pre-tool-use
match: "**/*"
---

# Bash 명령어 최적화 권장

bash 명령어 실행 시 더 나은 대안을 권장합니다.

## 최적화 규칙

### grep → ripgrep (rg)
```bash
# ❌ 느림
grep "pattern" file.txt

# ✅ 빠름
rg "pattern" file.txt
```

**이유**: ripgrep은 grep보다 훨씬 빠르고 기능이 풍부합니다.

### find -name → rg --files
```bash
# ❌ 느림
find . -name "*.ts"

# ✅ 빠름
rg --files -g "*.ts"
```

**이유**: ripgrep의 파일 검색이 find보다 빠릅니다.

### cat | grep → rg
```bash
# ❌ 불필요한 파이프
cat file.txt | grep "pattern"

# ✅ 직접 검색
rg "pattern" file.txt
```

## 적용 시점
- bash 명령어 실행 전 자동 체크
- 최적화 가능한 명령어 발견 시 권장 메시지 표시
