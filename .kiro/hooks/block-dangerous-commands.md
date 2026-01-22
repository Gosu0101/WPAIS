---
version: 1.0
event: bash
pattern: rm\s+-rf|drop\s+table|truncate\s+table|DELETE\s+FROM.*WHERE\s*$
action: block
---

# 위험한 명령어 차단

⚠️ **위험한 명령어가 감지되었습니다!**

## 감지된 패턴
- `rm -rf`: 재귀적 강제 삭제
- `DROP TABLE`: 테이블 삭제
- `TRUNCATE TABLE`: 테이블 데이터 전체 삭제
- `DELETE FROM ... (WHERE 없음)`: 조건 없는 삭제

## 조치 사항
1. 경로/테이블명이 정확한지 확인
2. 백업이 있는지 확인
3. 프로덕션 환경이 아닌지 확인
4. 정말 필요한 작업인지 재검토

## 대안
- 파일 삭제: `rm -i` (대화형) 또는 휴지통으로 이동
- DB 삭제: 트랜잭션 내에서 실행, 롤백 가능 확인
