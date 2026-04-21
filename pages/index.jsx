import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const ADSENSE_CLIENT = "ca-pub-8044640881453603";
const ADSENSE_SLOT = "0000000000"; // 심사 통과 후 교체

const AdBanner = () => {
  const [visible, setVisible] = useState(false);
  const lastScrollY = useRef(0);
  const adLoaded = useRef(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      const scrollingDown = currentY > lastScrollY.current;
      const pastThreshold = currentY > 80;
      setVisible(scrollingDown && pastThreshold);
      lastScrollY.current = currentY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!visible || adLoaded.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      adLoaded.current = true;
    } catch (e) {
      console.warn("AdSense push failed:", e);
    }
  }, [visible]);

  // AdSense 심사 통과 후 활성화 예정 — 현재 숨김 처리
  return null;
};

const normalizeData = (json) => ({
  sentiment:      json.sentiment,
  oneLineSummary: json.one_line_summary,
  summary:        json.summary,
  issues:         (json.issues  || []).map((item, i) => ({ ...item, id: item.id ?? i + 1, tickers: item.tickers || [] })),
  picks:          json.picks   || [],
  sectors:        json.sectors || [],
  indices:        json.indices  || [],
  fetchedAt:      json.batch_time,
});

// ── HELPERS ──────────────────────────────────────────────────────────────────
// 한국 기준: 상승 = 빨강, 하락 = 파랑
const BULL = "#ff3b3b";
const BEAR = "#4d8aff";
const sentimentColor = (s) => s === "bullish" ? BULL : BEAR;
const actionStyle = (a) => {
  if (a === "BUY")  return { bg: "rgba(255,59,59,0.15)",  color: BULL, border: `1px solid rgba(255,59,59,0.4)` };
  if (a === "SELL") return { bg: "rgba(77,138,255,0.15)", color: BEAR, border: `1px solid rgba(77,138,255,0.4)` };
  return               { bg: "rgba(245,200,66,0.12)",   color: "#f5c842",  border: "1px solid rgba(245,200,66,0.35)" };
};

const ScoreBar = ({ score }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
    <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
      <div style={{
        width: `${score}%`, height: "100%", borderRadius: 2,
        background: score > 70 ? BULL : score > 50 ? "#f5c842" : BEAR,
      }} />
    </div>
    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", width: 26, textAlign: "right" }}>{score}</span>
  </div>
);

// ── MOCK CHART DATA ──────────────────────────────────────────────────────────
const generateChartData = (base, up) => {
  const points = [];
  let val = base;
  const labels = ["09:00","09:30","10:00","10:30","11:00","11:30","12:00","13:00","13:30","14:00","14:30","15:00","15:30"];
  labels.forEach((t, i) => {
    const drift = (up ? 0.0008 : -0.0008) * i;
    const noise = (Math.random() - 0.48) * base * 0.004;
    val = val + val * drift + noise;
    points.push({ time: t, value: parseFloat(val.toFixed(2)) });
  });
  return points;
};

const INDEX_CHART_DATA = {
  "S&P 500": generateChartData(5200, true),
  "나스닥":  generateChartData(16200, true),
  "다우":    generateChartData(39100, false),
  "Fear & Greed": generateChartData(58, true),
  "코스피":  generateChartData(2640, false),
  "코스닥":  generateChartData(860, false),
  "원/달러": generateChartData(1368, true),
  "3년물":   generateChartData(3.48, true),
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#13151e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "7px 11px" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{payload[0].value.toLocaleString()}</div>
    </div>
  );
};

const IndexDetailSheet = ({ idx, onClose, accentColor }) => {
  const chartData = INDEX_CHART_DATA[idx.name] || [];
  const first = chartData[0]?.value || 0;
  const last  = chartData[chartData.length - 1]?.value || 0;
  const change = last - first;
  const changePct = ((change / first) * 100).toFixed(2);
  const isUp = change >= 0;
  const color = isUp ? BULL : BEAR;

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
        zIndex: 90, backdropFilter: "blur(4px)",
      }} />
      {/* Sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, zIndex: 100,
        background: "#0f1117",
        borderRadius: "20px 20px 0 0",
        border: "1px solid rgba(255,255,255,0.09)",
        animation: "slideUp 0.28s cubic-bezier(.32,1.2,.5,1) both",
      }}>
        <style>{`@keyframes slideUp { from{transform:translateX(-50%) translateY(100%)} to{transform:translateX(-50%) translateY(0)} }`}</style>

        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>

        <div style={{ padding: "8px 20px 40px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 4 }}>오늘 · 장중</div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>{idx.name}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 700, color }}>{idx.value}</div>
              <div style={{ fontSize: 12, color, marginTop: 2 }}>
                {isUp ? "▲" : "▼"} {Math.abs(changePct)}%
              </div>
            </div>
          </div>

          {/* Chart */}
          <div style={{ height: 180, marginBottom: 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" tick={{ fontSize: 9.5, fill: "rgba(255,255,255,0.25)" }} axisLine={false} tickLine={false} interval={2} />
                <YAxis hide domain={["auto", "auto"]} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.8} fill="url(#chartGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats row */}
          {[
            ["시가", chartData[0]?.value.toLocaleString()],
            ["현재가", last.toLocaleString()],
            ["등락", `${isUp ? "+" : ""}${changePct}%`],
          ].map(([label, val]) => (
            <div key={label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.05)",
            }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.38)" }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: label === "등락" ? color : "#dde1ea" }}>{val}</span>
            </div>
          ))}

          {/* Close btn */}
          <button onClick={onClose} style={{
            marginTop: 20, width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
            background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.55)",
            fontFamily: "inherit", fontSize: 13, cursor: "pointer",
          }}>닫기</button>
        </div>
      </div>
    </>
  );
};

// ── SCREENSHOT UPLOAD SHEET ───────────────────────────────────────────────────
const ScreenshotUploadSheet = ({ market, onClose, onResult }) => {
  const [images, setImages] = useState([]);       // [{ file, base64, preview }]
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = React.useRef(null);

  const toBase64 = (file) => new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });

  const handleFiles = async (files) => {
    const remaining = 2 - images.length;
    const selected = Array.from(files).slice(0, remaining);
    const newImgs = await Promise.all(selected.map(async (file) => ({
      file,
      preview: URL.createObjectURL(file),
      base64: await toBase64(file),
      mediaType: file.type,
    })));
    setImages((prev) => [...prev, ...newImgs]);
  };

  const removeImage = (i) => setImages((prev) => prev.filter((_, idx) => idx !== i));

  const handleDrop = (e) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const handleAnalyze = async () => {
    if (!images.length) return;
    setAnalyzing(true);
    setError(null);
    try {
      const marketLabel = market === "us" ? "미국 주식시장" : "한국 주식시장";
      const content = [
        ...images.map((img) => ({
          type: "image",
          source: { type: "base64", media_type: img.mediaType, data: img.base64 },
        })),
        {
          type: "text",
          text: `이 스크린샷은 ${marketLabel} 관련 뉴스/데이터 화면입니다.
스크린샷에서 시황 정보를 추출해 아래 JSON 형식으로만 응답하세요. 마크다운 없이 순수 JSON만.

{
  "sentiment": "bullish" | "bearish",
  "oneLineSummary": "한 줄 요약 (40자 이내)",
  "summary": "AI 시황 요약 (150자 이내)",
  "issues": [
    {
      "id": 1,
      "sentiment": "bullish" | "bearish",
      "sector": "섹터명",
      "title": "뉴스 제목",
      "tickers": ["티커1"],
      "body": "상세 내용 (100자 이내)"
    }
  ],
  "picks": [
    {
      "ticker": "티커",
      "name": "종목명",
      "action": "BUY" | "SELL" | "WATCH",
      "reason": "선택 이유 (80자 이내)"
    }
  ],
  "sectors": [
    {
      "name": "섹터명",
      "score": 0~100,
      "trend": "▲ +X.X%" | "▼ -X.X%",
      "note": "한 줄 메모"
    }
  ]
}

스크린샷에서 읽을 수 없는 필드는 합리적으로 추론하세요.`
        }
      ];

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{ role: "user", content }],
        }),
      });

      const json = await res.json();
      const raw = json.content?.find((b) => b.type === "text")?.text || "";
      const clean = raw.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean);

      parsed.fetchedAt = new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
      parsed.indices = parsed.indices || [];
      parsed.issues  = (parsed.issues  || []).map((item, i) => ({ ...item, id: i + 1, tickers: item.tickers || [] }));
      parsed.picks   = parsed.picks   || [];
      parsed.sectors = parsed.sectors || [];

      onResult(parsed);
      onClose();
    } catch (e) {
      setError("분석 중 오류가 발생했습니다.\n" + e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 90, backdropFilter: "blur(4px)" }} />
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480, zIndex: 100,
        background: "#0f1117", borderRadius: "20px 20px 0 0",
        border: "1px solid rgba(255,255,255,0.09)",
        animation: "slideUp 0.28s cubic-bezier(.32,1.2,.5,1) both",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
        </div>

        <div style={{ padding: "8px 20px 40px" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700 }}>📸 스크린샷으로 업데이트</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 3 }}>
                뉴스·차트 스크린샷 최대 2장
              </div>
            </div>
            <div className="tap" onClick={onClose} style={{ fontSize: 18, color: "rgba(255,255,255,0.3)", padding: 4 }}>✕</div>
          </div>

          {/* Upload slots */}
          <div style={{ display: "flex", gap: 10, marginTop: 16, marginBottom: 16 }}>
            {[0, 1].map((slot) => {
              const img = images[slot];
              return img ? (
                <div key={slot} style={{ flex: 1, aspectRatio: "9/16", position: "relative", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  <div className="tap" onClick={() => removeImage(slot)} style={{
                    position: "absolute", top: 6, right: 6,
                    background: "rgba(0,0,0,0.7)", borderRadius: "50%",
                    width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "#fff",
                  }}>✕</div>
                </div>
              ) : (
                <div key={slot} className="tap" onClick={() => images.length === slot && inputRef.current?.click()} style={{
                  flex: 1, aspectRatio: "9/16", borderRadius: 12,
                  border: `2px dashed ${images.length === slot ? "rgba(52,211,153,0.35)" : "rgba(255,255,255,0.08)"}`,
                  background: images.length === slot ? "rgba(52,211,153,0.04)" : "rgba(255,255,255,0.02)",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
                  opacity: images.length < slot ? 0.35 : 1,
                  cursor: images.length === slot ? "pointer" : "default",
                }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={images.length === slot ? handleDrop : undefined}
                >
                  <span style={{ fontSize: 28 }}>📷</span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", textAlign: "center", lineHeight: 1.5 }}>
                    {images.length === slot ? "탭하여\n업로드" : "2번째\n슬롯"}
                  </span>
                </div>
              );
            })}
          </div>

          <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => handleFiles(e.target.files)} />

          {/* Tips */}
          <div style={{ marginBottom: 16, padding: "10px 12px", borderRadius: 10, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 6 }}>💡 잘 되는 스크린샷</div>
            {["뉴스 앱 헤드라인 목록", "증권사 리포트 요약", "지수·등락률 화면", "텔레그램·카카오 시황 채널"].map((t) => (
              <div key={t} style={{ fontSize: 10.5, color: "rgba(255,255,255,0.45)", marginBottom: 3 }}>· {t}</div>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 12, fontSize: 11, color: "#ff4d6d", background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.2)", borderRadius: 8, padding: "10px 12px", whiteSpace: "pre-line" }}>
              {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={handleAnalyze}
            disabled={!images.length || analyzing}
            style={{
              width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: images.length && !analyzing ? "pointer" : "not-allowed",
              fontFamily: "inherit", fontSize: 14, fontWeight: 700,
              background: images.length && !analyzing ? "#34d399" : "rgba(255,255,255,0.07)",
              color: images.length && !analyzing ? "#07080c" : "rgba(255,255,255,0.25)",
              transition: "all 0.2s",
            }}
          >
            {analyzing ? "🤖 AI 분석 중..." : images.length ? `✦ 지금 분석하기 (${images.length}장)` : "스크린샷을 먼저 추가하세요"}
          </button>
        </div>
      </div>
    </>
  );
};

// ── MAIN ─────────────────────────────────────────────────────────────────────
const DATE_OPTIONS = (() => {
  const opts = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const label = d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
    const value = d.toISOString().slice(0, 10);
    opts.push({ label, value });
  }
  return opts;
})();

const ASSET_TABS = [
  { key: "stock",  label: "주식" },
  { key: "crypto", label: "가상자산" },
  { key: "realty", label: "부동산" },
  { key: "frac",   label: "실물자산" },
];

export default function MarketDaily() {
  const [assetTab, setAssetTab] = useState("stock");
  const [stockMarket, setStockMarket] = useState("us"); // 주식 탭 전용 us/kr
  const market = assetTab === "stock" ? stockMarket : assetTab; // 실제 API market 키
  const [tab, setTab] = useState("news");
  const [expanded, setExpanded] = useState(null);
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0].value);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState(null);

  // 스켈레톤 4초 이상 지속 시 안내 문구로 전환
  useEffect(() => {
    if (!loading) { setLoadingTimeout(false); return; }
    const t = setTimeout(() => setLoadingTimeout(true), 4000);
    return () => clearTimeout(t);
  }, [loading]);

  const fetchData = React.useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setFetchError(null);
    fetch(`/api/market?market=${market}&date=${selectedDate}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) { setFetchError(json.error); setData(null); }
        else setData(normalizeData(json));
      })
      .catch((e) => setFetchError(e.message))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [market, selectedDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const accentColor = stockMarket === "us" ? "#4d8aff" : "#ff6b35";

  const switchMarket = (mkt) => { setStockMarket(mkt); setTab("news"); setExpanded(null); };

  return (
    <>
      <Head>
        <title>+α | 월급만으론 부족한 우리를 위해</title>
      </Head>
    <div style={{
      fontFamily: "'IBM Plex Mono', monospace",
      background: "#07080c", minHeight: "100vh",
      maxWidth: 480, margin: "0 auto", color: "#dde1ea",
      display: "flex", flexDirection: "column",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display: none; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
        .fade-up { animation: fadeUp .28s ease both; }
        .tap { cursor: pointer; transition: opacity .1s; }
        .tap:active { opacity: .6; }
      `}</style>

      {/* ── HEADER ── */}
      <div style={{ padding: "16px 16px 0", position: "sticky", top: 0, background: "#07080c", zIndex: 50 }}>
        {/* 1줄: 왼쪽(BI) + 오른쪽(날짜+업데이트) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          {/* 왼쪽: +α + 태그라인 + BETA */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: -0.5, color: "#00e5a0", fontStyle: "italic", lineHeight: 1, flexShrink: 0 }}>+α</span>
            <span style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", letterSpacing: 0.1, lineHeight: 1 }}>월급만으론 부족한 우리를 위해</span>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 1,
              padding: "2px 6px", borderRadius: 4, flexShrink: 0,
              background: "rgba(255,255,255,0.07)",
              color: "rgba(255,255,255,0.4)",
              border: "1px solid rgba(255,255,255,0.15)",
            }}>BETA</span>
          </div>
          {/* 오른쪽: 날짜 select + 업데이트 시각 */}
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 6 }}>
            <select
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 20, color: "rgba(255,255,255,0.7)",
                fontFamily: "inherit", fontSize: 12,
                padding: "6px 26px 6px 14px", cursor: "pointer", outline: "none",
                appearance: "none", WebkitAppearance: "none",
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='rgba(255,255,255,0.4)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center",
              }}
            >
              {DATE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} style={{ background: "#1a1c24" }}>{opt.label}</option>
              ))}
            </select>
            {data && (
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                · {data.fetchedAt} 업데이트
              </span>
            )}
          </div>
        </div>

        {/* ── 자산 카테고리 탭 ── */}
        <div style={{ display: "flex", gap: 6, marginBottom: 8, overflowX: "auto" }}>
          {ASSET_TABS.map((a) => (
            <button key={a.key} onClick={() => { setAssetTab(a.key); setData(null); setTab("news"); setExpanded(null); }} style={{
              flexShrink: 0,
              padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 12, fontWeight: assetTab === a.key ? 700 : 500,
              transition: "all 0.18s",
              background: assetTab === a.key ? "#00e5a0" : "rgba(255,255,255,0.06)",
              color: assetTab === a.key ? "#07080c" : "rgba(255,255,255,0.45)",
            }}>{a.label}</button>
          ))}
        </div>

        {/* Market toggle — 주식 탭일 때만 */}
        {assetTab === "stock" && (
        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
          {[{ key: "us", label: "🇺🇸 미국", color: "#4d8aff" }, { key: "kr", label: "🇰🇷 한국", color: "#ff6b35" }].map((m) => (
            <button key={m.key} onClick={() => switchMarket(m.key)} style={{
              flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
              fontFamily: "inherit", fontSize: 13, fontWeight: 600, transition: "all 0.2s",
              background: market === m.key ? m.color : "rgba(255,255,255,0.05)",
              color: market === m.key ? "#fff" : "rgba(255,255,255,0.4)",
              boxShadow: market === m.key ? `0 2px 14px ${m.color}44` : "none",
            }}>{m.label}</button>
          ))}
        </div>
        )}

        <>
        {/* Sentiment + one-liner */}
        {data && (() => {
          const noNewsKeywords = ["뉴스 부재", "뉴스 없음", "뉴스 무재", "뉴스 부족", "데이터 부재", "데이터 없음", "데이터 부족", "뉴스 데이터", "수집 실패", "정보 부족", "자료 부족"];
          const hideOneliner = noNewsKeywords.some(k => data.oneLineSummary?.includes(k));
          return (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 600, flexShrink: 0,
              background: data.sentiment === "bullish" ? "rgba(0,229,160,0.12)" : "rgba(255,77,109,0.12)",
              color: data.sentiment === "bullish" ? "#00e5a0" : "#ff4d6d",
              border: `1px solid ${data.sentiment === "bullish" ? "rgba(0,229,160,0.3)" : "rgba(255,77,109,0.3)"}`,
            }}>
              {data.sentiment === "bullish" ? "▲ 강세" : "▼ 약세"}
            </span>
            {!hideOneliner && (
              <span style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", lineHeight: 1.45 }}>{data.oneLineSummary}</span>
            )}
          </div>
          );
        })()}

        {/* Indices */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16, paddingBottom: 12 }}>
          {(data?.indices || []).map((idx) => {
            const fgNum = idx.name === "Fear & Greed" ? parseFloat(idx.value) : null;
            const fgLabel = fgNum !== null
              ? fgNum < 25  ? { text: "🔴 극단적 공포", color: "#ff4d6d" }
              : fgNum < 45  ? { text: "🟡 공포",        color: "#f5c842" }
              : fgNum < 55  ? { text: "⚪ 중립",         color: "rgba(255,255,255,0.55)" }
              : fgNum < 75  ? { text: "🟢 탐욕",         color: "#34d399" }
              :               { text: "🔵 극단적 탐욕",  color: "#4d8aff" }
              : null;
            return (
              <div key={idx.name} style={{
                flexShrink: 0, background: "rgba(255,255,255,0.04)", border: `1px solid ${fgLabel ? fgLabel.color + "33" : "rgba(255,255,255,0.07)"}`,
                borderRadius: 10, padding: "8px 12px", minWidth: 86,
                display: "flex", alignItems: "center",
              }}>
                <div>
                  <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.33)", marginBottom: 3 }}>{idx.name}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: idx.up ? BULL : BEAR }}>{idx.value}</div>
                  {fgLabel && (
                    <div style={{ fontSize: 9, fontWeight: 600, color: fgLabel.color, marginTop: 3 }}>{fgLabel.text}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.07)", marginLeft: -16, marginRight: -16, paddingLeft: 16, paddingRight: 16 }}>
          {[{ key: "news", label: "이슈" }, { key: "picks", label: "추천 종목" }, { key: "sectors", label: "섹터" }].map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
              fontSize: 12.5, fontWeight: tab === t.key ? 600 : 400, padding: "10px 4px",
              color: tab === t.key ? "#00e5a0" : "rgba(255,255,255,0.32)",
              borderBottom: `2px solid ${tab === t.key ? "#00e5a0" : "transparent"}`,
              transition: "all .2s",
            }}>{t.label}</button>
          ))}
        </div>
        </>
      </div>

      {/* ── BODY ── */}
      <div style={{ flex: 1, padding: "14px 16px 40px" }}>

        {/* 로딩 — 스켈레톤 (4초 이내) 또는 안내 문구 (4초 초과) */}
        {loading && (
          loadingTimeout ? (
            <div style={{ textAlign: "center", padding: "72px 24px" }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>☕</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginBottom: 8, letterSpacing: -0.3 }}>
                오늘 브리핑을 준비 중이에요
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.28)", lineHeight: 1.7 }}>
                보통 오전 9시에 업데이트돼요
              </div>
            </div>
          ) : (
          <div>
            <style>{`
              @keyframes shimmer {
                0% { background-position: -400px 0; }
                100% { background-position: 400px 0; }
              }
              .skeleton {
                background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
                background-size: 800px 100%;
                animation: shimmer 1.4s infinite;
                border-radius: 8px;
              }
            `}</style>
            {/* Summary skeleton */}
            <div style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", padding: "13px 14px", marginBottom: 16 }}>
              <div className="skeleton" style={{ height: 10, width: "40%", marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 12, width: "100%", marginBottom: 7 }} />
              <div className="skeleton" style={{ height: 12, width: "80%" }} />
            </div>
            {/* Card skeletons */}
            {[1,2,3].map((i) => (
              <div key={i} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.06)", padding: "13px 14px", marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                  <div className="skeleton" style={{ height: 18, width: 52, borderRadius: 4 }} />
                  <div className="skeleton" style={{ height: 10, width: 60 }} />
                </div>
                <div className="skeleton" style={{ height: 13, width: "90%", marginBottom: 6 }} />
                <div className="skeleton" style={{ height: 13, width: "65%" }} />
              </div>
            ))}
          </div>
          )
        )}

        {/* 데이터 없음 / 에러 */}
        {!loading && (fetchError || !data) && (() => {
          const isNoData = fetchError === "데이터 없음" || !data;
          const dow = new Date(selectedDate + "T12:00:00").getDay(); // 0=Sun, 6=Sat
          const isWeekend = dow === 0 || dow === 6;

          if (!isNoData) {
            return (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 12, color: "#ff4d6d" }}>{fetchError}</div>
              </div>
            );
          }

          // 비주식 탭: 준비 중 안내
          if (assetTab !== "stock") {
            return (
              <div style={{ textAlign: "center", padding: "80px 24px" }}>
                <div style={{ fontSize: 36, marginBottom: 18 }}>🙏</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.55)", marginBottom: 10, letterSpacing: -0.3 }}>
                  준비 중입니다
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.28)", lineHeight: 1.9 }}>
                  곧 업데이트될 예정이에요 🙏
                </div>
              </div>
            );
          }

          if (isWeekend) {
            return (
              <div style={{ textAlign: "center", padding: "72px 24px" }}>
                <div style={{ fontSize: 40, marginBottom: 18 }}>📵</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 10, letterSpacing: -0.3 }}>
                  오늘은 마켓이 쉬는 날이에요
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.9 }}>
                  주말엔 포지션도 내려놓고 쉬어가세요<br />
                  +α는 월요일 아침에 깨어있을게요 ☀️
                </div>
              </div>
            );
          }

          return (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
              <div style={{ marginBottom: 12, fontSize: 28 }}>☕</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
                아직 오늘 브리핑이 없어요
              </div>
              <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.25)", lineHeight: 1.7 }}>
                보통 장 시작 전 오전 8시 30분,<br />
                장 마감 후 오후 4시에 발행돼요
              </div>
              <div className="tap" onClick={() => fetchData(true)} style={{
                marginTop: 20, display: "inline-block",
                fontSize: 11, padding: "7px 18px", borderRadius: 20,
                border: "1px solid rgba(255,255,255,0.12)",
                color: "rgba(255,255,255,0.4)", cursor: "pointer",
              }}>
                {refreshing ? "확인 중..." : "↻ 다시 확인"}
              </div>
            </div>
          );
        })()}

        {/* 실제 콘텐츠 */}
        {!loading && data && (<>

        {/* AI 요약 */}
        <div style={{ marginBottom: 16, borderRadius: 12, border: "1px solid rgba(52,211,153,0.18)", overflow: "hidden" }}>
          <div style={{ background: "rgba(52,211,153,0.05)", padding: "13px 14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 10, color: "#34d399", letterSpacing: 1.5, fontWeight: 500 }}>✦ AI 시황 요약</div>
              <div className="tap" onClick={() => fetchData(true)} style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, padding: "3px 9px", cursor: "pointer", opacity: refreshing ? 0.5 : 1 }}>{refreshing ? "⏳" : "↻"} 최신으로</div>
            </div>
            <p style={{ fontSize: 12.5, lineHeight: 1.75, color: "rgba(255,255,255,0.78)" }}>{data.summary}</p>
            {data.picks?.length > 0 && (
              <div
                className="tap"
                onClick={() => { setTab(tab === "picks" ? "news" : "picks"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                style={{
                  marginTop: 12, paddingTop: 10,
                  borderTop: "1px solid rgba(52,211,153,0.15)",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 11, color: "#34d399", fontWeight: 600 }}>
                    {tab === "picks" ? "종목 닫기" : "관련 종목 보기"}
                  </span>
                  <span style={{
                    fontSize: 10, fontWeight: 700,
                    background: "rgba(52,211,153,0.12)", color: "#34d399",
                    border: "1px solid rgba(52,211,153,0.25)",
                    borderRadius: 4, padding: "1px 6px",
                  }}>{data.picks.length}</span>
                </div>
                <span style={{
                  fontSize: 13, color: "#34d399", opacity: 0.7,
                  display: "inline-block",
                  transform: tab === "picks" ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}>→</span>
              </div>
            )}
          </div>
        </div>

        {/* 이슈 탭 */}
        {tab === "news" && (
          <div className="fade-up">
            {data.issues.map((item) => (
              <div key={item.id} className="tap"
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                style={{
                  marginBottom: 10, borderRadius: 12,
                  border: `1px solid rgba(255,255,255,${expanded === item.id ? ".10" : ".06"})`,
                  background: expanded === item.id ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.02)",
                }}>
                <div style={{ padding: "13px 14px 12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{
                      fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 500,
                      background: `rgba(${item.sentiment === "bullish" ? "255,59,59" : "77,138,255"},0.1)`,
                      color: sentimentColor(item.sentiment),
                      border: `1px solid rgba(${item.sentiment === "bullish" ? "255,59,59" : "77,138,255"},0.25)`,
                    }}>
                      {item.sentiment === "bullish" ? "▲ 강세" : "▼ 약세"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.22)" }}>#{item.sector}</span>
                      <span style={{
                        fontSize: 14, color: "rgba(255,255,255,0.25)",
                        transform: expanded === item.id ? "rotate(90deg)" : "rotate(0deg)",
                        transition: "transform 0.2s ease", display: "inline-block",
                      }}>›</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.4, marginBottom: item.tickers?.length ? 8 : 0 }}>{item.title}</p>
                  {item.tickers?.length > 0 && (
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {item.tickers.map((t) => (
                        <span key={t} style={{ fontSize: 10, color: "rgba(255,255,255,0.42)", background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "2px 7px" }}>
                          {market === "us" ? "$" : ""}{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {expanded === item.id && (
                  <div className="fade-up" style={{ padding: "0 14px 13px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 11 }}>
                    <p style={{ fontSize: 12.5, lineHeight: 1.72, color: "rgba(255,255,255,0.65)" }}>{item.body}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 종목픽 탭 */}
        {tab === "picks" && (
          <div className="fade-up">
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.27)", marginBottom: 14, lineHeight: 1.6 }}>
              ⚠ AI가 실시간 뉴스 기반으로 선별한 참고용입니다. 투자 판단은 본인 책임입니다.
            </div>
            {data.picks.map((pick, i) => {
              const st = actionStyle(pick.action);
              return (
                <div key={`${pick.ticker}-${i}`} style={{ marginBottom: 10, borderRadius: 12, padding: "14px 15px", border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 3 }}>{pick.ticker}</div>
                      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>{pick.name}</div>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 7, background: st.bg, color: st.color, border: st.border }}>
                      {pick.action}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 9 }}>
                    {pick.reason}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 섹터 탭 */}
        {tab === "sectors" && (
          <div className="fade-up">
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.27)", marginBottom: 16 }}>
              {market === "us" ? "🇺🇸 미국" : "🇰🇷 한국"} 섹터 모멘텀 스코어 (0–100)
            </div>
            {data.sectors.map((sec) => (
              <div key={sec.name} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, alignItems: "baseline" }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{sec.name}</span>
                    {sec.note && <span style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginLeft: 7 }}>{sec.note}</span>}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: sec.trend.startsWith("▲") ? BULL : BEAR }}>{sec.trend}</span>
                </div>
                <ScoreBar score={sec.score} />
              </div>
            ))}
            <div style={{ marginTop: 18, borderRadius: 12, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.07)", padding: "13px 15px" }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.23)", marginBottom: 10, letterSpacing: 1 }}>SCORE 가이드</div>
              {[["70–100", BULL, "강세 진입 구간"], ["50–69", "#f5c842", "중립 / 관망"], ["0–49", BEAR, "약세 / 회피"]].map(([r, c, l]) => (
                <div key={r} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: c, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: c, width: 56 }}>{r}</span>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,0.38)" }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        </>)}
      </div>

      {/* 포트폴리오 진단 링크 */}
      <div style={{ padding: "8px 20px 32px", textAlign: "center" }}>
        <a href="/portfolio" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "10px 20px", borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.02)",
          color: "rgba(255,255,255,0.45)",
          fontSize: 12, fontWeight: 600,
          textDecoration: "none", fontFamily: "inherit",
          letterSpacing: 0.2,
        }}>
          <span style={{ color: "#00e5a0", fontSize: 14 }}>◎</span>
          포트폴리오 진단
          <span style={{ opacity: 0.4, fontSize: 11 }}>→</span>
        </a>
      </div>

      {/* IndexDetailSheet: 실시간 데이터 연동 전까지 비활성화 */}
    </div>
    <AdBanner />
    </>
  );
}
