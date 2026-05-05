// components/TrendBadge.jsx
// F-04: 추세 표기 통일 — 색 + 기호(▲/▼/─) 항상 함께 표시

// ── 추세 맵 (기존 토큰 색만 사용, 신규 색 없음) ─────────────────
const TREND_MAP = {
  up:   { sign: "+", arrow: "▲", color: "#34D399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.28)"  },
  down: { sign: "−", arrow: "▼", color: "#E08968", bg: "rgba(224,137,104,0.12)", border: "rgba(224,137,104,0.28)" },
  flat: { sign: "·", arrow: "─", color: "#9FB3A6", bg: "rgba(159,179,166,0.10)", border: "rgba(159,179,166,0.25)" },
};

/**
 * sentiment 문자열 ("bullish" | "bearish" | 기타) → Trend 키로 변환
 */
export function sentimentToTrend(sentiment) {
  if (sentiment === "bullish") return "up";
  if (sentiment === "bearish") return "down";
  return "flat";
}

/**
 * @param {{ trend: "up"|"down"|"flat", label?: string, size?: "sm"|"md" }} props
 * label: 없으면 기본값("강세"/"약세"/"보합") 사용
 */
export default function TrendBadge({ trend = "flat", label, size = "sm" }) {
  const t = TREND_MAP[trend] ?? TREND_MAP.flat;

  const defaultLabels = { up: "강세", down: "약세", flat: "보합" };
  const displayLabel  = label ?? defaultLabels[trend];

  const fontSize   = size === "md" ? 12 : 10;
  const padding    = size === "md" ? "3px 10px" : "2px 8px";

  return (
    <span
      aria-label={`${t.sign} ${displayLabel} ${t.arrow}`}
      style={{
        display:    "inline-flex",
        alignItems: "center",
        gap:        3,
        fontSize,
        fontWeight: 600,
        padding,
        borderRadius: 4,
        color:        t.color,
        background:   t.bg,
        border:       `1px solid ${t.border}`,
        whiteSpace:   "nowrap",
        letterSpacing: 0,
      }}
    >
      {t.sign}&nbsp;{displayLabel}&nbsp;{t.arrow}
    </span>
  );
}
