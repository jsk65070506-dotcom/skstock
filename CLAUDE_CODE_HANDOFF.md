# Claude Code 이전용 컨텍스트 문서

이 문서를 Claude Code 첫 프롬프트에 붙여넣으세요.

---

## 프로젝트 개요

**꾸기 Market Daily** — AI 기반 미국·한국 시장 일일 시황 브리핑 서비스

### 컨셉
- 모바일 웹 앱 (Next.js)
- 관리자가 스크린샷 업로드 → Claude Vision이 시황 JSON 생성 → DB 저장
- 유저가 서비스 페이지에서 실시간 시황 확인

### 배치 스케줄
한국시간 기준: **09:00 / 13:00 / 18:00 / 23:00** (하루 4번)

---

## 현재 파일 구조

```
pages/
├── index.jsx              서비스 페이지 (유저가 보는 시황 브리핑 UI)
├── admin.jsx              관리자 페이지 (스크린샷 업로드 + AI 분석 + 발행)
└── api/
    └── analyze.js         Claude Vision API 라우트 (스크린샷 → JSON 변환)

.env.local
└── ANTHROPIC_API_KEY=sk-ant-...
```

---

## 완료된 작업

### 서비스 페이지 (`pages/index.jsx`)
- 미국/한국 시장 토글
- 우측 상단 날짜 드롭다운 (최근 7일)
- AI 시황 요약 카드 + "관련 종목 보기" CTA (탭 토글, 화살표 회전)
- 지수 카드 (S&P/나스닥/다우/Fear & Greed) — chevron 클릭 시 슬라이드업 차트 상세 (recharts)
- Fear & Greed Index 조건부 레이블 (극단적 공포 → 극단적 탐욕)
- 3개 탭: 이슈 / 종목픽 / 섹터 모멘텀
- 이슈 카드 클릭 펼치기
- **현재 Mock 데이터로 작동** — DB 연동 필요

### 관리자 페이지 (`pages/admin.jsx`)
- STEP 1: 시장/날짜/배치 선택
- STEP 2: 스크린샷 업로드 (최대 30장, 리스트 뷰)
- STEP 3: Claude Vision 분석 (`POST /api/analyze`)
- STEP 4: 서비스 반영 (현재 mock delay만, DB 저장 미구현)

### API 라우트 (`pages/api/analyze.js`)
- `POST /api/analyze`
- Request: `{ images: [{ base64, mediaType }], market: "us"|"kr" }`
- Response: `{ sentiment, oneLineSummary, summary, issues[], picks[], sectors[] }`
- Claude Sonnet 4 사용 (`claude-sonnet-4-20250514`)
- 25MB까지 허용

---

## 남은 작업 (우선순위 순)

### 1. DB 셋업
- **추천: Supabase** (postgres + free tier + SQL 쿼리 편함)
- 대안: Vercel KV (Redis 기반, 간단하지만 쿼리 제한적)
- 테이블 스키마 예시:

```sql
CREATE TABLE market_briefings (
  id BIGSERIAL PRIMARY KEY,
  market TEXT NOT NULL,           -- 'us' | 'kr'
  date DATE NOT NULL,
  batch_time TEXT NOT NULL,       -- '09:00' | '13:00' | '18:00' | '23:00'
  sentiment TEXT,
  one_line_summary TEXT,
  summary TEXT,
  issues JSONB,
  picks JSONB,
  sectors JSONB,
  indices JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(market, date, batch_time)
);
```

### 2. 발행 API 구현
`POST /api/admin/publish` — 관리자가 분석 결과를 DB에 저장
- 관리자 페이지 `handlePublish` 함수 실제 구현
- UPSERT로 동일 (market, date, batch_time) 덮어쓰기

### 3. 조회 API
`GET /api/market?market=us&date=2026-04-18&batch=09:00`
- 서비스 페이지에서 호출
- 해당 배치의 가장 최신 데이터 반환
- 없으면 직전 배치 fallback

### 4. 서비스 페이지 실데이터 연동
- 현재 `MOCK_US`, `MOCK_KR` 상수 → API 호출로 교체
- 날짜 드롭다운 변경 시 재호출
- 에러/로딩 상태 처리

### 5. 배치 자동화 (선택)
- Vercel Cron으로 `09:00/13:00/18:00/23:00 KST`에 유저에게 "새 브리핑 있음" 알림
- 또는 서비스 페이지 폴링

### 6. 관리자 인증
- 현재 오픈 상태 → 간단한 비밀번호 게이트 또는 NextAuth
- Middleware로 `/admin` 경로 보호

---

## 기술 스택 & 디자인 시스템

- **Next.js 14+** (Pages Router)
- **React 18**
- **recharts** — 차트 (서비스 페이지 지수 상세)
- **스타일**: inline style (CSS-in-JS 라이브러리 없음, 인라인으로 작성됨)
- **폰트**: IBM Plex Mono
- **컬러 팔레트**:
  - 배경: `#07080c`
  - 텍스트: `#dde1ea`
  - Bullish: `#00e5a0` (초록)
  - Bearish: `#ff4d6d` (빨강)
  - 미국 액센트: `#4d8aff` (파랑)
  - 한국 액센트: `#ff6b35` (주황)
  - 경계/중립: `#f5c842` (노랑)

---

## 주의사항

- 서비스 페이지는 **480px maxWidth 모바일 레이아웃**
- 스크롤바 숨김: `::-webkit-scrollbar { display: none; }`
- 애니메이션: `fadeUp`, `slideUp`, `spin` keyframes 정의됨
- 이미지는 base64로 API에 전송 (25MB body limit 설정됨)

---

## 첫 작업 추천

```
1. Supabase 프로젝트 생성 + market_briefings 테이블 생성
2. @supabase/supabase-js 설치 + lib/supabase.js 클라이언트 설정
3. /api/admin/publish 구현 (INSERT/UPSERT)
4. 관리자 페이지 handlePublish 연결 테스트
5. /api/market 구현 (GET)
6. 서비스 페이지 pages/index.jsx에서 useEffect로 데이터 fetch
```
