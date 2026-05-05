// pages/index.jsx
import React, { useState } from "react";
import Head from "next/head";
import SubscribeForm from "../components/SubscribeForm";
import { createClient } from "@supabase/supabase-js";

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
  ];
}

// ── Supabase 데이터 → 카드 포맷 변환 ───────────────────────────
function rowToBrief(row, dateLabel) {
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
  };
}

// ── 픽 신호 스타일 ───────────────────────────────────────────────
function signalStyle(signal) {
  if (signal === "긍정") return { color: BULL, bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.3)" };
  if (signal === "부정") return { color: BEAR, bg: "rgba(224,137,104,0.12)", border: "rgba(224,137,104,0.3)" };
  return { color: NEUTRAL, bg: "rgba(159,179,166,0.10)", border: "rgba(159,179,166,0.25)" };
}

// ── 샘플 브리핑 카드 ─────────────────────────────────────────────
function SampleCard({ brief }) {
  const [open, setOpen] = useState(false);
  const isUp = brief.sentiment === "bullish";
  const sentimentColor = isUp ? BULL : BEAR;

  return (
    <div style={{
      background: "#101F18",
      border: "1px solid rgba(232,239,234,0.08)",
      borderRadius: 12,
      padding: "20px",
      cursor: "pointer",
      transition: "border-color 0.2s",
    }}
    onMouseEnter={(e) => e.currentTarget.style.borderColor = "rgba(52,211,153,0.25)"}
    onMouseLeave={(e) => e.currentTarget.style.borderColor = "rgba(232,239,234,0.08)"}
    onClick={() => setOpen(!open)}
    >
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{brief.flag}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EFEA" }}>{brief.label}</div>
            <div style={{ fontSize: 10, color: "#6B8274" }}>{brief.date}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 600,
            background: isUp ? "rgba(52,211,153,0.12)" : "rgba(224,137,104,0.12)",
            color: sentimentColor,
            border: `1px solid ${isUp ? "rgba(52,211,153,0.28)" : "rgba(224,137,104,0.28)"}`,
          }}>
            {isUp ? "+ 강세" : "− 약세"}
          </span>
          <span style={{ fontSize: 12, color: "#6B8274" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* 한 줄 요약 */}
      <div style={{ fontSize: 14, fontWeight: 600, color: "#E8EFEA", lineHeight: 1.4, marginBottom: 8 }}>
        {brief.oneLineSummary}
      </div>

      {/* AI 요약 */}
      <div style={{ fontSize: 12, color: "#9FB3A6", lineHeight: 1.6 }}>
        {brief.summary}
      </div>

      {/* 확장 영역 */}
      {open && (
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(232,239,234,0.06)", paddingTop: 16 }}>

          {/* 주요 이슈 */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#6B8274", marginBottom: 8, textTransform: "uppercase" }}>주요 이슈</div>
            {brief.issues.map((issue, i) => (
              <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid rgba(232,239,234,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  <span style={{
                    fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600,
                    background: issue.sentiment === "bullish" ? "rgba(52,211,153,0.12)" : "rgba(224,137,104,0.12)",
                    color: issue.sentiment === "bullish" ? BULL : BEAR,
                    border: `1px solid ${issue.sentiment === "bullish" ? "rgba(52,211,153,0.28)" : "rgba(224,137,104,0.28)"}`,
                  }}>
                    {issue.sentiment === "bullish" ? "+ 강세" : "− 약세"}
                  </span>
                  <span style={{ fontSize: 9, color: "#6B8274" }}>#{issue.sector}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#E8EFEA", lineHeight: 1.4 }}>{issue.title}</div>
              </div>
            ))}
          </div>

          {/* 오늘의 주목 포인트 */}
          <div>
            <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#6B8274", marginBottom: 8, textTransform: "uppercase" }}>오늘의 주목 포인트</div>
            {brief.picks.map((pick, i) => {
              const sig = signalStyle(pick.signal);
              return (
                <div key={i} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                  padding: "8px 0", borderBottom: i < brief.picks.length - 1 ? "1px solid rgba(232,239,234,0.05)" : "none",
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#E8EFEA", fontFamily: "monospace" }}>{pick.ticker}</span>
                      <span style={{ fontSize: 11, color: "#6B8274" }}>{pick.name}</span>
                    </div>
                    {pick.reason && (
                      <div style={{ fontSize: 11, color: "#6B8274", marginTop: 2 }}>{pick.reason}</div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 5,
                    background: sig.bg, color: sig.color, border: `1px solid ${sig.border}`,
                    flexShrink: 0, marginLeft: 12,
                  }}>
                    {pick.signal}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 14, fontSize: 10, color: "#4A6353", lineHeight: 1.6 }}>
            ※ 본 내용은 투자 권유가 아닌 정보 제공 목적입니다. 투자 판단의 책임은 본인에게 있습니다.
          </div>
        </div>
      )}
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────────────────
export default function HomePage({ briefs, dateLabel, isLive }) {
  return (
    <>
      <Head>
        <title>Plusalpha — 매일 아침 시장 뉴스레터</title>
        <meta name="description" content="주식·가상자산·부동산 뉴스를 빠르게 전달해 매일 아침 9시에 이메일로 보내드립니다." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
          <div>
            <span style={{ fontSize: 13, fontWeight: 500, color: BULL }}>+</span>
            <span style={{ fontFamily: "'Georgia', serif", fontStyle: "italic", fontSize: 22, color: BULL, lineHeight: 1 }}>α</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: NEUTRAL, marginLeft: 6 }}>Plusalpha</span>
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

            <h1 style={{
              fontSize: 34,
              fontWeight: 800, letterSpacing: "-0.5px",
              lineHeight: 1.25, margin: "0 0 16px",
              color: "#dde1ea",
            }}>
              <span style={{ color: "#00e5a0" }}>월급만으로 부족한</span>{" "}우리를 위해
            </h1>

            <p style={{
              fontSize: 16, color: "rgba(255,255,255,0.55)", lineHeight: 1.6,
              margin: "0 0 36px", marginTop: 12, maxWidth: 400, marginLeft: "auto", marginRight: "auto",
            }}>
              주식·가상자산·부동산 뉴스를 <span style={{ color: "#00e5a0" }}>빠르게</span> 전달해드려요.
            </p>

            {/* 구독 폼 */}
            <div style={{ maxWidth: 400, margin: "0 auto" }}>
              <SubscribeForm variant="hero" />
            </div>

            {/* 구독자 수 표시 */}
            <div style={{ marginTop: 16, fontSize: 11, color: "#6B8274" }}>
              지금 바로 무료로 시작하세요
            </div>
          </div>

          {/* ── 특징 3가지 ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
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

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {briefs.map((brief) => (
                <SampleCard key={brief.key} brief={brief} />
              ))}
            </div>
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
        </div>
      </div>
    </>
  );
}

// ── 서버사이드 데이터 패칭 ────────────────────────────────────────
export async function getServerSideProps() {
  const dateStr = getKstDateString();
  const dateLabel = formatDateLabel(dateStr);

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
      .map(row => rowToBrief(row, dateLabel));

    if (ordered.length > 0) {
      return { props: { briefs: ordered, dateLabel, isLive: true } };
    }
  } catch (e) {
    console.error("[index] getServerSideProps 오류:", e?.message);
  }

  // 데이터 없으면 샘플 fallback
  return { props: { briefs: getSampleBriefs(dateLabel), dateLabel, isLive: false } };
}
