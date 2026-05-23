// components/BriefingCard.jsx
// F-13: 카드 4종 구조 통일  F-14: 카드별 정량 신호 1개  F-04: TrendBadge 사용
import { useState } from "react";
import TrendBadge, { sentimentToTrend } from "./TrendBadge";

// ── 브랜드 토큰 (index.jsx와 동일, 신규 추가 없음) ──────────────
const BULL    = "#34D399";
const BEAR    = "#E08968";
const NEUTRAL = "#9FB3A6";

// ── F-14: 시장별 더미 지표 ───────────────────────────────────────
// TODO: connect to process.env.NEXT_PUBLIC_METRICS_PROVIDER
const DEFAULT_METRICS = {
  us:     { label: "S&P 500",  value: "5,320.07", delta: "+1.40%" },
  kr:     { label: "KOSPI",    value: "2,641.30",  delta: "-0.82%" },
  crypto: { label: "BTC",      value: "$89,240",   delta: "+2.10%" },
  realty: { label: "기준금리",  value: "3.50%",     delta: null     },
};

// ── 신호 정규화 (AI 오타 대응: 부증/부중/negative → 부정 등) ────
function normalizeSignal(raw) {
  if (!raw) return "중립";
  const s = raw.trim();
  if (/^(긍정|강세|매수|positive|bullish|상승)/i.test(s)) return "긍정";
  if (/^(부정|부증|부중|약세|매도|negative|bearish|하락)/i.test(s)) return "부정";
  return "중립";
}

// ── 픽 신호 스타일 ───────────────────────────────────────────────
function signalStyle(signal) {
  const s = normalizeSignal(signal);
  if (s === "긍정") return { color: BULL, bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.30)" };
  if (s === "부정") return { color: BEAR, bg: "rgba(224,137,104,0.12)", border: "rgba(224,137,104,0.30)" };
  return { color: NEUTRAL, bg: "rgba(159,179,166,0.10)", border: "rgba(159,179,166,0.25)" };
}

// ── F-14: Metric 슬롯 ────────────────────────────────────────────
function Metric({ label, value, delta }) {
  const isPos = delta && delta.startsWith("+");
  const isNeg = delta && delta.startsWith("-");
  const deltaColor = isPos ? BULL : isNeg ? BEAR : NEUTRAL;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "8px 12px",
      background: "rgba(232,239,234,0.04)",
      borderRadius: 8,
      border: "1px solid rgba(232,239,234,0.07)",
      marginBottom: 12,
    }}>
      <span style={{ fontSize: 10, color: "#6B8274", letterSpacing: "0.06em", flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "#E8EFEA", fontFamily: "monospace", flexShrink: 0 }}>
        {value}
      </span>
      {delta && (
        <span style={{ fontSize: 11, fontWeight: 600, color: deltaColor, marginLeft: "auto", flexShrink: 0 }}>
          {delta}
        </span>
      )}
    </div>
  );
}

// ── F-13: BriefingCard (통일 구조) ──────────────────────────────
/**
 * @typedef {{
 *   key: 'us'|'kr'|'crypto'|'realty',
 *   flag: string,
 *   label: string,
 *   date: string,
 *   sentiment: 'bullish'|'bearish',
 *   oneLineSummary: string,
 *   summary: string,
 *   issues: {title:string, sentiment:string, sector:string}[],
 *   picks: {ticker:string, name:string, signal:string, reason?:string}[],
 *   metric?: {label:string, value:string, delta?:string},
 *   sources?: string[],
 * }} BriefData
 */

/**
 * @param {{ brief: BriefData, locked?: boolean, onLockedClick?: () => void }} props
 */
export default function BriefingCard({ brief, locked = false, onLockedClick }) {
  const [open, setOpen] = useState(false);

  const trend   = sentimentToTrend(brief.sentiment);
  const metric  = brief.metric ?? DEFAULT_METRICS[brief.key] ?? null;
  const sources = brief.sources ?? ["AI 요약"];

  const handleClick = () => {
    if (locked) { onLockedClick?.(); return; }
    setOpen((o) => !o);
  };

  return (
    <div
      onClick={handleClick}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = locked ? "rgba(52,211,153,0.35)" : "rgba(52,211,153,0.25)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "rgba(232,239,234,0.08)")}
      style={{
        background:    "#101F18",
        border:        "1px solid rgba(232,239,234,0.08)",
        borderRadius:  12,
        padding:       "20px",
        cursor:        "pointer",
        transition:    "border-color 0.2s",
      }}
    >
      {/* ── 헤더 ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 18 }}>{brief.flag}</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#E8EFEA" }}>{brief.label}</div>
            <div style={{ fontSize: 10, color: "#6B8274" }}>{brief.date}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendBadge trend={trend} />
          <span style={{ fontSize: 12, color: "#6B8274" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>

      {/* ── F-14: 정량 지표 ── */}
      {metric && <Metric label={metric.label} value={metric.value} delta={metric.delta} />}

      {/* ── 잠금 상태 ── */}
      {locked ? (
        <div style={{
          marginTop: 8,
          padding: "18px",
          textAlign: "center",
          background: "rgba(0,0,0,0.18)",
          borderRadius: 8,
          border: "1px solid rgba(52,211,153,0.14)",
        }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#34D399" }}>🔒 구독 후 확인</div>
        </div>
      ) : (
      <>
      {/* ── 헤드라인 (한 줄 요약) ── */}
      <div style={{ fontSize: 14, fontWeight: 600, color: "#E8EFEA", lineHeight: 1.4, marginBottom: 8 }}>
        {brief.oneLineSummary}
      </div>

      {/* ── 바디 (접힌 상태: 3줄 clamp) ── */}
      <div style={{
        fontSize: 12, color: "#9FB3A6", lineHeight: 1.6,
        ...(open ? {} : {
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }),
      }}>
        {brief.summary}
      </div>

      {/* ── 확장 영역 ── */}
      {open && (
        <div style={{ marginTop: 16, borderTop: "1px solid rgba(232,239,234,0.06)", paddingTop: 16 }}>

          {/* 주요 이슈 */}
          {brief.issues?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#6B8274", marginBottom: 8, textTransform: "uppercase" }}>주요 이슈</div>
              {brief.issues.map((issue, i) => (
                <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: "1px solid rgba(232,239,234,0.05)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <TrendBadge trend={sentimentToTrend(issue.sentiment)} />
                    <span style={{ fontSize: 9, color: "#6B8274" }}>#{issue.sector}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#E8EFEA", lineHeight: 1.4 }}>{issue.title}</div>
                </div>
              ))}
            </div>
          )}

          {/* 오늘의 주목 포인트 */}
          {brief.picks?.length > 0 && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "#6B8274", marginBottom: 8, textTransform: "uppercase" }}>오늘의 주목 포인트</div>
              {brief.picks.map((pick, i) => {
                const normalizedSignal = normalizeSignal(pick.signal);
                const sig = signalStyle(normalizedSignal);
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
                      {normalizedSignal}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── F-13: 출처 footer ── */}
          <div style={{ marginTop: 14, fontSize: 10, color: "#4A6353", lineHeight: 1.6 }}>
            AI 요약 · 기반 매체: {sources.join(" · ")}
            <br />※ 본 내용은 투자 권유가 아닌 정보 제공 목적입니다. 투자 판단의 책임은 본인에게 있습니다.
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
