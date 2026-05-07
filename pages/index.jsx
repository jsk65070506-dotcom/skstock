// pages/index.jsx
import React from "react";
import Head from "next/head";
import SubscribeForm from "../components/SubscribeForm";
import BriefingCard from "../components/BriefingCard";
import PlusAlphaLogo from "../components/PlusAlphaLogo";
import { createClient } from "@supabase/supabase-js";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://skstock.vercel.app";

// ── 브랜드 색상 ──────────────────────────────────────────────────
const BULL = "#34D399";
const BEAR = "#E08968";
const NEUTRAL = "#9FB3A6";

// ── KST 날짜 유틸 ──────────────────────────────────────────────
function getKstDateString() {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr) {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}월 ${d}일`;
}

// ── 샘플 브리핑 (Supabase 데이터 없을 때 fallback) ──────────────
function getSampleBriefs(dateLabel) {
  return [
    {
      key: "us",
      label: "미국 주식",
      flag: "🇺🇸",
      sentiment: "bullish",
      date: dateLabel,
      oneLineSummary: "연준 동결 시사에 기술주 반등, S&P 500 사흘 만에 상승 전환",
      summary: "파월 의장의 추가 인상 자제 발언이 시장을 안심시키며 빅테크 중심으로 매수세 유입. 나스닥 +1.4% 마감.",
      issues: [
        { title: "파월 '추가 인상 서두르지 않겠다' 발언", sentiment: "bullish", sector: "매크로" },
        { title: "애플·MS 실적 예상치 상회 — 클라우드 부문 강세", sentiment: "bullish", sector: "빅테크" },
        { title: "지역은행 예금 이탈 우려 재부상", sentiment: "bearish", sector: "금융" },
      ],
      picks: [
        { ticker: "NVDA", name: "엔비디아", signal: "긍정", reason: "AI 칩 수요 지속 + 데이터센터 성장" },
        { ticker: "MSFT", name: "마이크로소프트", signal: "긍정", reason: "애저 클라우드 성장률 회복" },
        { ticker: "KRE", name: "지역은행 ETF", signal: "부정", reason: "예금 이탈 + 상업용 부동산 리스크" },
      ],
    },
    {
      key: "kr",
      label: "한국 주식",
      flag: "🇰🇷",
      sentiment: "bearish",
      date: dateLabel,
      oneLineSummary: "외국인 순매도 확대, 코스피 2,640선 하회 마감",
      summary: "원화 약세와 글로벌 달러 강세가 겹치며 외국인이 코스피를 3거래일 연속 순매도. 반도체·2차전지 동반 하락.",
      issues: [
        { title: "외국인 코스피 3거래일 연속 순매도 — 5,800억 이탈", sentiment: "bearish", sector: "수급" },
        { title: "원달러 환율 1,370원대 — 수입물가 부담 확대", sentiment: "bearish", sector: "환율" },
        { title: "삼성전자 HBM 공급 확대 협상 긍정 신호", sentiment: "bullish", sector: "반도체" },
      ],
      picks: [
        { ticker: "005930", name: "삼성전자", signal: "중립", reason: "HBM 수혜 기대 vs 단기 수급 부담" },
        { ticker: "373220", name: "LG에너지솔루션", signal: "부정", reason: "미국 IRA 세액공제 불확실성 지속" },
      ],
    },
    {
      key: "crypto",
      label: "가상자산",
      flag: "💎",
      sentiment: "bullish",
      date: dateLabel,
      oneLineSummary: "비트코인 9만 달러 돌파 시도, ETF 자금 유입 지속",
      summary: "미국 현물 ETF 순유입이 이어지며 BTC 9만 달러 저항선 재도전. 이더리움도 동반 강세를 보이며 알트코인 전반 상승.",
      issues: [
        { title: "BTC 현물 ETF 3일 연속 순유입 — 5억 달러 돌파", sentiment: "bullish", sector: "ETF" },
        { title: "이더리움 Pectra 업그레이드 일정 확정", sentiment: "bullish", sector: "이더리움" },
        { title: "SEC, 알트코인 규제 가이드라인 발표 예고", sentiment: "bearish", sector: "규제" },
      ],
      picks: [
        { ticker: "BTC", name: "비트코인", signal: "긍정", reason: "ETF 수요 + 반감기 후 공급 감소 효과" },
        { ticker: "ETH", name: "이더리움", signal: "긍정", reason: "Pectra 업그레이드 호재 + 스테이킹 수요" },
      ],
    },
    {
      key: "realty",
      label: "실물자산",
      flag: "🏢",
      sentiment: "bullish",
      date: dateLabel,
      oneLineSummary: "조각투자·STO 시장 성장세, 음악·한우·건물 신규 공모 주목",
      summary: "금리 인하 기대감과 함께 실물자산 조각투자 플랫폼 거래량 증가. STO 법제화 논의 본격화로 기관 참여 확대 전망.",
      issues: [
        { title: "뮤직카우, 음악 저작권 조각투자 신규 공모 오픈", sentiment: "bullish", sector: "음악조각투자" },
        { title: "한우 조각투자 플랫폼 거래량 전월 대비 30% 증가", sentiment: "bullish", sector: "한우조각투자" },
        { title: "STO 법제화 논의 — 금융위 가이드라인 하반기 발표 예정", sentiment: "bullish", sector: "STO" },
      ],
      picks: [
        { ticker: "뮤직카우", name: "음악 저작권", signal: "긍정", reason: "신규 공모 흥행 + 월정액 수익 안정성" },
        { ticker: "카사", name: "건물 조각투자", signal: "중립", reason: "공실률 리스크 vs 임대 수익 기대" },
      ],
    },
  ];
}

// ── 실시간 시장 지표 조회 ────────────────────────────────────────
// BTC: CoinGecko (무인증, Vercel 허용)
// S&P500/KOSPI: Stooq CSV (무인증)
async function fetchLivePrices() {
  const metrics = {};

  // BTC — CoinGecko
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const data = await res.json();
      const price  = data?.bitcoin?.usd;
      const change = data?.bitcoin?.usd_24h_change;
      if (price) {
        metrics.crypto = {
          label: "BTC",
          value: "$" + Math.round(price).toLocaleString("en-US"),
          delta: (change >= 0 ? "+" : "") + change.toFixed(2) + "%",
        };
      }
    }
  } catch { /* fallback */ }

  // S&P 500 — Stooq
  try {
    const res = await fetch(
      "https://stooq.com/q/l/?s=^spx&f=sd2t2ohlcv&h&e=csv",
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split("\n");
      const cols  = lines[1]?.split(",");
      // Symbol,Date,Time,Open,High,Low,Close,Volume
      const close = parseFloat(cols?.[6]);
      const open  = parseFloat(cols?.[3]);
      if (close && open) {
        const changePct = ((close - open) / open) * 100;
        metrics.us = {
          label: "S&P 500",
          value: close.toLocaleString("en-US", { maximumFractionDigits: 2 }),
          delta: (changePct >= 0 ? "+" : "") + changePct.toFixed(2) + "%",
        };
      }
    }
  } catch { /* fallback */ }

  // KOSPI — Stooq
  try {
    const res = await fetch(
      "https://stooq.com/q/l/?s=^kospi&f=sd2t2ohlcv&h&e=csv",
      { signal: AbortSignal.timeout(6000) }
    );
    if (res.ok) {
      const text = await res.text();
      const lines = text.trim().split("\n");
      const cols  = lines[1]?.split(",");
      const close = parseFloat(cols?.[6]);
      const open  = parseFloat(cols?.[3]);
      if (close && open) {
        const changePct = ((close - open) / open) * 100;
        metrics.kr = {
          label: "KOSPI",
          value: close.toLocaleString("ko-KR", { maximumFractionDigits: 2 }),
          delta: (changePct >= 0 ? "+" : "") + changePct.toFixed(2) + "%",
        };
      }
    }
  } catch { /* fallback */ }

  return metrics;
}

// ── Supabase 데이터 → 카드 포맷 변환 ───────────────────────────
function rowToBrief(row, dateLabel, metric) {
  const META = {
    us:     { label: "미국 주식",  flag: "🇺🇸" },
    kr:     { label: "한국 주식",  flag: "🇰🇷" },
    crypto: { label: "가상자산",   flag: "💎" },
    realty: { label: "실물자산",   flag: "🏢" },
  };
  const m = META[row.market] || { label: row.market, flag: "📊" };
  return {
    key: row.market,
    label: m.label,
    flag: m.flag,
    sentiment: row.sentiment,
    date: dateLabel,
    oneLineSummary: row.one_line_summary || "",
    summary: row.summary || "",
    issues: Array.isArray(row.issues) ? row.issues : [],
    picks: Array.isArray(row.picks) ? row.picks : [],
    ...(metric ? { metric } : {}),
  };
}

// ── F-02 완료: 샘플 잠금 해제 (이미 머지됨) ──────────────────────

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function HomePage({ briefs, dateLabel, isLive }) {
  return (
    <>
      <Head>
        <title>Plusalpha — 매일 아침 시장 뉴스레터</title>
        <meta name="description" content="주식·가상자산·부동산 뉴스를 빠르게 전달해 매일 아침 9시에 이메일로 보내드립니다." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* F-10: OG / Twitter 메타 */}
        <meta property="og:title"       content="Plusalpha — 매일 아침 시장 뉴스레터" />
        <meta property="og:description" content="주식·가상자산·부동산 시황을 AI가 매일 새벽 정리해 09:00 KST에 이메일로 보내드립니다. 무료 · 광고 없음." />
        <meta property="og:type"        content="website" />
        <meta property="og:url"         content={SITE_URL} />
        <meta property="og:image"       content={`${SITE_URL}/og-image.png`} />
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="Plusalpha — 매일 아침 시장 뉴스레터" />
        <meta name="twitter:description" content="주식·가상자산·부동산 시황을 AI가 매일 09:00 KST에 정리해 드립니다." />
        <meta name="twitter:image"       content={`${SITE_URL}/og-image.png`} />
        <link rel="icon" href="/favicon.ico" />
        {/* F-12: 반응형 Hero — 단일 컴포넌트, 미디어쿼리로 분기 */}
        <style>{`
          .hero-title { font-size: 28px; }
          .hero-desc  { font-size: 14px; }
          .feature-grid { grid-template-columns: repeat(3, 1fr); }
          @media (min-width: 480px) {
            .hero-title { font-size: 34px; }
            .hero-desc  { font-size: 16px; }
          }
          @media (max-width: 360px) {
            .feature-grid { grid-template-columns: 1fr; }
          }
        `}</style>
      </Head>

      <div style={{
        minHeight: "100vh",
        background: "#0A1510",
        color: "#E8EFEA",
        fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif",
      }}>

        {/* ── 네비게이션 ── */}
        <nav style={{
          borderBottom: "1px solid rgba(232,239,234,0.06)",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: 600,
          margin: "0 auto",
        }}>
          {/* F-10: PlusAlphaLogo 컴포넌트 */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <PlusAlphaLogo size={28} />
            <span style={{ fontSize: 12, fontWeight: 600, color: NEUTRAL }}>Plusalpha</span>
          </div>
          <div style={{ fontSize: 11, color: "#6B8274" }}>매일 09:00 KST</div>
        </nav>

        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 20px 60px" }}>

          {/* ── 히어로 ── */}
          <div style={{ textAlign: "center", padding: "56px 0 48px" }}>
            <div style={{
              display: "inline-block",
              fontSize: 11, fontWeight: 600, letterSpacing: "0.08em",
              color: BULL, background: "rgba(52,211,153,0.1)",
              border: "1px solid rgba(52,211,153,0.25)",
              borderRadius: 20, padding: "4px 12px", marginBottom: 20,
            }}>
              무료 · 광고 없음 · 언제든 해지
            </div>

            <h1 className="hero-title" style={{
              fontWeight: 800, letterSpacing: "-0.5px",
              lineHeight: 1.25, margin: "0 0 16px",
              color: "#dde1ea",
            }}>
              <span style={{ color: "#00e5a0" }}>월급만으로 부족한</span>{" "}우리를 위해
            </h1>

            <p className="hero-desc" style={{
              color: "rgba(255,255,255,0.55)", lineHeight: 1.6,
              margin: "0 0 36px", marginTop: 12, maxWidth: 400, marginLeft: "auto", marginRight: "auto",
            }}>
              주식·가상자산·부동산 뉴스를 <span style={{ color: "#00e5a0" }}>빠르게</span> 전달해드려요.
            </p>

            {/* F-01: Hero 인라인 이메일 폼 */}
            <div style={{ maxWidth: 400, margin: "0 auto" }}>
              <SubscribeForm variant="default" />
            </div>

            {/* F-05: 발송 메타 칩 라인 */}
            <div style={{ marginTop: 14, display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 6 }}>
              {["평일 09:00 KST", "본문 5분", "광고 0", "1클릭 해지"].map((chip) => (
                <span key={chip} style={{
                  fontSize: 11, color: "#6B8274",
                  background: "rgba(107,130,116,0.10)",
                  border: "1px solid rgba(107,130,116,0.18)",
                  borderRadius: 20, padding: "3px 10px",
                }}>
                  {chip}
                </span>
              ))}
            </div>

            {/* F-03: AI 출처 한 줄 */}
            <div style={{ marginTop: 20, fontSize: 11, color: "#4A6353", lineHeight: 1.6 }}>
              AI가 매일 새벽, 주요 매체 헤드라인을 정리해 만듭니다. 투자 판단의 책임은 본인에게 있습니다.
            </div>
          </div>

          {/* ── 특징 3가지 ── */}
          <div className="feature-grid" style={{
            display: "grid",
            gap: 12,
            marginBottom: 48,
          }}>
            {[
              { icon: "🤖", title: "핵심 요약", desc: "AI가 여러 뉴스를 모아 핵심만 짧게 정리합니다." },
              { icon: "⏰", title: "매일 09:00", desc: "장 시작 전, 시황을 먼저 파악" },
              { icon: "📊", title: "4개 시장", desc: "미국·한국 주식, 가상자산, 부동산" },
            ].map((f) => (
              <div key={f.title} style={{
                background: "#101F18",
                border: "1px solid rgba(232,239,234,0.06)",
                borderRadius: 10,
                padding: "16px 14px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: 22, marginBottom: 8 }}>{f.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EFEA", marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 11, color: "#6B8274", lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            ))}
          </div>

          {/* ── 브리핑 카드 ── */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#6B8274", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 6 }}>
                {isLive ? "Today's Briefing" : "Sample Briefing"}
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "#E8EFEA", letterSpacing: -0.3 }}>
                {isLive ? `${dateLabel} 오늘의 뉴스` : "이런 내용이 매일 도착해요"}
              </div>
              <div style={{ fontSize: 12, color: "#6B8274", marginTop: 4 }}>
                카드를 눌러 상세 내용을 확인하세요
              </div>
            </div>

            {/* F-13: BriefingCard 통일 구조 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {briefs.map((brief) => (
                <BriefingCard key={brief.key} brief={brief} />
              ))}
            </div>
          </div>

          {/* ── F-15: 가입 시 추가 가치 한 줄 ── */}
          <div style={{
            marginBottom: 20,
            padding: "14px 18px",
            background: "rgba(52,211,153,0.05)",
            border: "1px solid rgba(52,211,153,0.14)",
            borderRadius: 10,
            fontSize: 13, color: "#9FB3A6", lineHeight: 1.6, textAlign: "center",
          }}>
            <span style={{ color: "#34D399", fontWeight: 700 }}>가입하면</span> 4개 시장 전체 + 지난 7일치 아카이브 + 관심 종목 알림을 받을 수 있어요.
          </div>

          {/* ── 하단 CTA ── */}
          <div style={{
            background: "linear-gradient(135deg, #0F2318 0%, #0A1510 100%)",
            border: "1px solid rgba(52,211,153,0.15)",
            borderRadius: 16,
            padding: "32px 24px",
            textAlign: "center",
            marginBottom: 40,
          }}>
            <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5, marginBottom: 8 }}>
              월급 그 이상을 위해, 지금 시작하세요
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, marginBottom: 24, textAlign: "center" }}>
              매일 아침 9시 · 무료 · 광고 없음 · 언제든 해지
            </div>
            <div style={{ maxWidth: 380, margin: "0 auto" }}>
              <SubscribeForm variant="compact" />
            </div>
          </div>

          {/* ── 면책 고지 ── */}
          <div style={{
            fontSize: 10, color: "#4A6353", lineHeight: 1.7, textAlign: "center",
          }}>
            본 서비스는 투자 권유가 아닌 정보 제공 목적입니다.<br />
            제공된 시황 정보는 AI가 뉴스 헤드라인을 기반으로 생성한 참고 자료이며,<br />
            투자 판단의 책임은 본인에게 있습니다.
          </div>

          {/* ── F-09: 운영자·문의·정책 footer ── */}
          <div style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid rgba(232,239,234,0.06)",
            fontSize: 10, color: "#4A6353", textAlign: "center", lineHeight: 2,
          }}>
            운영: Plusalpha &nbsp;·&nbsp;
            <a href="mailto:jsk65070506@gmail.com" style={{ color: "#4A6353", textDecoration: "underline" }}>
              문의: jsk65070506@gmail.com
            </a>
            &nbsp;·&nbsp;
            <a href="/privacy" style={{ color: "#4A6353", textDecoration: "underline" }}>개인정보 처리방침</a>
            &nbsp;·&nbsp;
            <a href="/terms" style={{ color: "#4A6353", textDecoration: "underline" }}>이용약관</a>
            <br />
            {/* 정보통신망법 §50의5 송신자 정보 표시 */}
            광고성 정보를 원치 않으시면 매 메일 하단 &apos;구독 해지&apos; 링크를 이용해주세요.
          </div>
        </div>
      </div>
    </>
  );
}

// ── 서버사이드 데이터 패칭 ────────────────────────────────────────
export async function getServerSideProps() {
  const dateStr = getKstDateString();
  const dateLabel = formatDateLabel(dateStr);

  // 실시간 가격 병렬 조회
  const liveMetrics = await fetchLivePrices();

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    const MARKETS = ["us", "kr", "crypto", "realty"];

    const { data: rows } = await supabase
      .from("market_briefings")
      .select("market, sentiment, one_line_summary, summary, issues, picks")
      .eq("date", dateStr)
      .in("market", MARKETS)
      .order("batch_time", { ascending: false });

    // 시장별 최신 1개씩만 추출
    const seen = new Set();
    const deduped = [];
    for (const row of (rows || [])) {
      if (!seen.has(row.market)) {
        seen.add(row.market);
        deduped.push(row);
      }
    }

    // 원하는 순서로 정렬
    const ordered = MARKETS
      .map(m => deduped.find(r => r.market === m))
      .filter(Boolean)
      .map(row => rowToBrief(row, dateLabel, liveMetrics[row.market] ?? null));

    if (ordered.length > 0) {
      return { props: { briefs: ordered, dateLabel, isLive: true } };
    }
  } catch (e) {
    console.error("[index] getServerSideProps 오류:", e?.message);
  }

  // 데이터 없으면 샘플 fallback (실시간 지표는 그대로 전달)
  return { props: { briefs: getSampleBriefs(dateLabel).map(b => ({ ...b, ...(liveMetrics[b.key] ? { metric: liveMetrics[b.key] } : {}) })), dateLabel, isLive: false } };
}
