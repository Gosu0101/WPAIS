---
inclusion: fileMatch
fileMatchPattern: "**/*.{tsx,jsx,vue,svelte,html,css,scss}"
---

# 프론트엔드 디자인 가이드

프론트엔드 파일 작업 시 자동으로 적용되는 디자인 가이드라인입니다.
"AI 슬롭" 미학을 피하고 독창적이고 기억에 남는 인터페이스를 만듭니다.

## 디자인 씽킹 프로세스

코딩 전에 명확한 방향을 설정하세요:

### 1. 목적 (Purpose)
- 이 인터페이스가 해결하는 문제는?
- 사용자는 누구인가?

### 2. 톤 (Tone) - 극단적 방향 선택
| 스타일 | 특징 |
|--------|------|
| 브루탈 미니멀 | 극도로 절제된, 여백 중심 |
| 맥시멀리스트 | 풍부한 디테일, 레이어드 |
| 레트로 퓨처리스틱 | 80-90년대 미래 상상 |
| 오가닉/내추럴 | 유기적 곡선, 자연 색상 |
| 럭셔리/리파인드 | 고급스러운, 정제된 |
| 플레이풀/토이라이크 | 장난스러운, 친근한 |
| 에디토리얼/매거진 | 잡지 레이아웃 스타일 |
| 브루탈리스트/로우 | 거친, 날것의 |
| 아트데코/지오메트릭 | 기하학적 패턴 |
| 소프트/파스텔 | 부드러운 색감 |
| 인더스트리얼 | 산업적, 기능적 |

### 3. 차별화 (Differentiation)
- 사용자가 기억할 **한 가지**는 무엇인가?

## 피해야 할 것 (AI 슬롭)

### ❌ 절대 사용 금지
- **폰트**: Inter, Roboto, Arial, 시스템 폰트
- **색상**: 보라색 그라데이션 + 흰 배경 (클리셰)
- **레이아웃**: 예측 가능한 카드 그리드
- **컴포넌트**: 쿠키커터 패턴

### ❌ 피해야 할 패턴
```css
/* 나쁜 예 - 제네릭 AI 스타일 */
font-family: Inter, sans-serif;
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
border-radius: 12px;
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
```

## 집중해야 할 것

### 1. 타이포그래피
```css
/* 좋은 예 - 독특한 폰트 조합 */
--font-display: 'Playfair Display', serif;  /* 디스플레이용 */
--font-body: 'Source Serif Pro', serif;     /* 본문용 */

/* 또는 모던한 조합 */
--font-display: 'Clash Display', sans-serif;
--font-body: 'Satoshi', sans-serif;
```

### 2. 컬러 & 테마
```css
/* 대담한 팔레트 - 지배색 + 날카로운 악센트 */
:root {
  --color-dominant: #0a0a0a;
  --color-accent: #ff3d00;
  --color-subtle: #f5f5f5;
}
```

### 3. 모션 & 애니메이션
```css
/* 고임팩트 페이지 로드 애니메이션 */
@keyframes reveal {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

.stagger-1 { animation-delay: 0.1s; }
.stagger-2 { animation-delay: 0.2s; }
.stagger-3 { animation-delay: 0.3s; }
```

### 4. 공간 구성
- 비대칭 레이아웃
- 오버랩 요소
- 대각선 흐름
- 그리드 파괴 요소
- 넉넉한 여백 OR 통제된 밀도

### 5. 배경 & 비주얼 디테일
```css
/* 분위기 있는 배경 */
background: 
  radial-gradient(ellipse at top, rgba(255,61,0,0.1), transparent),
  linear-gradient(180deg, #0a0a0a 0%, #1a1a1a 100%);

/* 노이즈 텍스처 오버레이 */
&::after {
  content: '';
  background-image: url('/noise.png');
  opacity: 0.03;
  mix-blend-mode: overlay;
}
```

## WPAIS 프론트엔드 가이드

### 웹툰 제작 관리 대시보드 스타일 제안

#### 옵션 A: 에디토리얼/매거진 스타일
- 잡지 레이아웃 느낌
- 큰 타이포그래피
- 이미지 중심 카드
- 웹툰 산업과 어울림

#### 옵션 B: 인더스트리얼/유틸리티
- 기능 중심
- 데이터 밀도 높음
- 모노스페이스 폰트
- 생산성 도구 느낌

#### 옵션 C: 소프트/모던
- 부드러운 그라데이션
- 라운드 코너
- 친근한 느낌
- 크리에이터 친화적

## 체크리스트

프론트엔드 작업 완료 전 확인:

- [ ] 제네릭 폰트 사용하지 않았는가?
- [ ] 클리셰 컬러 스킴 피했는가?
- [ ] 명확한 미적 방향이 있는가?
- [ ] 기억에 남는 요소가 있는가?
- [ ] 의도적인 디자인 선택인가?
