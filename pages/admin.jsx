// pages/admin.jsx
import React, { useState, useRef, useEffect } from "react";
import Head from "next/head";

// MAX 1000px, JPEG 72% → 장당 약 60~100KB, 30장 = ~2.5MB (Vercel 4.5MB 한도 이내)
const toBase64 = (file) => new Promise((res, rej) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const MAX = 1000;
    let w = img.width, h = img.height;
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else { w = Math.round(w * MAX / h); h = MAX; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    res(canvas.toDataURL("image/jpeg", 0.72).split(",")[1]);
  };
  img.onerror = rej;
  img.src = url;
});

// signal: 긍정(bullish) / 부정(bearish) / 중립 — 구버전 BUY/SELL/WATCH 호환 포함
const actionColor = (a) => {
  if (a === "긍정" || a === "BUY")  return "#34d399";
  if (a === "부정" || a === "SELL") return "#ff4d6d";
  return "#f5c842"; // 중립 | WATCH
};

const BATCH_TIMES = ["09:00", "09:10"];

const ASSET_TABS = [
  { key: "stock",  label: "주식",     color: "#4d8aff" },
  { key: "realty", label: "부동산",   color: "#f5c842" },
  { key: "crypto", label: "가상자산", color: "#a78bfa" },
  { key: "frac",   label: "실물자산", color: "#34d399" },
];
const DATE_OPTIONS = (() => {
  const opts = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    opts.push({
      label: i === 0 ? "오늘" : d.toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" }),
      value: d.toISOString().slice(0, 10),
    });
  }
  return opts;
})();

// ── RESULT PREVIEW ──────────────────────────────────────────────────────────
const ResultPreview = ({ result, market }) => (
  <div style={{ marginTop: 20 }}>
    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 12 }}>▸ 분석 결과</div>

    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
      <span style={{
        fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 600, flexShrink: 0,
        background: result.sentiment === "bullish" ? "rgba(52,211,153,0.12)" : "rgba(255,77,109,0.12)",
        color: result.sentiment === "bullish" ? "#34d399" : "#ff4d6d",
        border: `1px solid ${result.sentiment === "bullish" ? "rgba(52,211,153,0.3)" : "rgba(255,77,109,0.3)"}`,
      }}>
        {result.sentiment === "bullish" ? "▲ 강세" : "▼ 약세"}
      </span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{result.oneLineSummary}</span>
    </div>

    <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(52,211,153,0.04)", border: "1px solid rgba(52,211,153,0.15)", marginBottom: 12 }}>
      <p style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>{result.summary}</p>
    </div>

    {result.issues?.length > 0 && (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>📰 이슈 {result.issues.length}건</div>
        {result.issues.map((item, i) => (
          <div key={i} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", marginBottom: 6 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: item.sentiment === "bullish" ? "rgba(52,211,153,0.1)" : "rgba(255,77,109,0.1)", color: item.sentiment === "bullish" ? "#34d399" : "#ff4d6d" }}>{item.sentiment === "bullish" ? "▲" : "▼"}</span>
              <span style={{ fontSize: 9, color: "rgba(255,255,255,0.25)" }}>#{item.sector}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#dde1ea", marginBottom: 4 }}>{item.title}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>{item.body}</div>
            {item.tickers?.length > 0 && (
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                {item.tickers.map((t) => <span key={t} style={{ fontSize: 9.5, color: "rgba(255,255,255,0.4)", background: "rgba(255,255,255,0.05)", borderRadius: 4, padding: "1px 6px" }}>{market === "us" ? "$" : ""}{t}</span>)}
              </div>
            )}
          </div>
        ))}
      </div>
    )}

    {result.picks?.length > 0 && (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>🎯 종목픽 {result.picks.length}개</div>
        {result.picks.map((p, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", marginBottom: 6 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#dde1ea" }}>{p.ticker}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{p.name}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 5, lineHeight: 1.5 }}>{p.reason}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, flexShrink: 0, marginLeft: 10, background: `${actionColor(p.action)}18`, color: actionColor(p.action), border: `1px solid ${actionColor(p.action)}44` }}>{p.action}</span>
          </div>
        ))}
      </div>
    )}

    {result.sectors?.length > 0 && (
      <div>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>📊 섹터 모멘텀</div>
        {result.sectors.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div style={{ width: 70, fontSize: 11, color: "rgba(255,255,255,0.6)", flexShrink: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
            <div style={{ flex: 1, height: 3, background: "rgba(255,255,255,0.07)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${s.score}%`, height: "100%", borderRadius: 2, background: s.score > 70 ? "#34d399" : s.score > 50 ? "#f5c842" : "#ff4d6d" }} />
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", width: 22, textAlign: "right", flexShrink: 0 }}>{s.score}</span>
            <span style={{ fontSize: 10, color: s.trend?.startsWith("▲") ? "#34d399" : "#ff4d6d", width: 60, textAlign: "right", flexShrink: 0 }}>{s.trend}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ── PASSWORD SCREEN ─────────────────────────────────────────────────────────
const ADMIN_PASSWORD = "kkugi2024";

function PasswordScreen({ onSuccess }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (input === ADMIN_PASSWORD) {
      if (typeof window !== "undefined") sessionStorage.setItem("adminAuth", "true");
      onSuccess();
    } else {
      setError(true);
      setInput("");
    }
  };

  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", background: "#07080c", minHeight: "100vh", maxWidth: 480, margin: "0 auto", color: "#dde1ea", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 32px" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07080c; }
      `}</style>
      <div style={{ fontSize: 28, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6, fontStyle: "italic" }}>
        <span style={{ color: "#34d399" }}>+α</span> <span style={{ fontStyle: "normal", fontWeight: 400, fontSize: 13, color: "rgba(255,255,255,0.5)" }}>관리자</span>
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginBottom: 28 }}>관리자 비밀번호를 입력하세요</div>
      <input
        type="password"
        value={input}
        onChange={(e) => { setInput(e.target.value); setError(false); }}
        onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        placeholder="비밀번호"
        autoFocus
        style={{
          width: "100%", padding: "13px 16px", borderRadius: 12,
          border: error ? "1px solid rgba(255,77,109,0.6)" : "1px solid rgba(255,255,255,0.12)",
          background: "rgba(255,255,255,0.04)", color: "#dde1ea",
          fontFamily: "inherit", fontSize: 14, outline: "none",
          marginBottom: 8, textAlign: "center", letterSpacing: 4,
        }}
      />
      {error && <div style={{ fontSize: 11, color: "#ff4d6d", marginBottom: 12 }}>비밀번호가 틀렸어요</div>}
      <button onClick={handleSubmit} style={{
        width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
        fontFamily: "inherit", fontSize: 13, fontWeight: 700, marginTop: error ? 0 : 8,
        background: "#34d399", color: "#07080c", cursor: "pointer",
      }}>
        입장하기 →
      </button>
    </div>
  );
}

// ── MAIN ────────────────────────────────────────────────────────────────────
export default function MarketAdmin() {
  // SSR 수화 오류 방지 — sessionStorage는 클라이언트 전용
  const [authenticated, setAuthenticated] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("adminAuth") === "true") setAuthenticated(true);
  }, []);
  const [assetTab, setAssetTab] = useState("stock");
  const [stockMarket, setStockMarket] = useState("us"); // 주식 탭용 us/kr
  const market = assetTab === "stock" ? stockMarket : assetTab; // 실제 market 키
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0].value);
  const [selectedBatch, setSelectedBatch] = useState(BATCH_TIMES[0]);
  const [images, setImages] = useState([]);
  const [textContent, setTextContent] = useState("");
  const [analystNotes, setAnalystNotes] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const inputRef = useRef(null);

  const handleFiles = async (files) => {
    const remaining = 30 - images.length;
    if (remaining <= 0) return;
    setError(null);
    try {
      const selected = Array.from(files).slice(0, remaining);
      const newImgs = await Promise.all(selected.map(async (file) => ({
        base64: await toBase64(file),
        mediaType: "image/jpeg",
        name: file.name,
        sizeKB: Math.round(file.size / 1024),
      })));
      setImages((prev) => [...prev, ...newImgs]);
      setResult(null);
      setPublished(false);
    } catch (e) {
      setError({ msg: "이미지 읽기 실패", detail: e.message });
    }
  };

  const removeImage = (i) => { setImages((prev) => prev.filter((_, idx) => idx !== i)); setResult(null); };
  const reset = () => { setImages([]); setTextContent(""); setAnalystNotes(""); setResult(null); setPublished(false); setError(null); };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      // 모든 탭에서 스크린샷 + 텍스트 모두 지원
      const body = {
        ...(images.length > 0 && { images: images.map((img) => ({ base64: img.base64, mediaType: img.mediaType })) }),
        ...(textContent.trim() && { textContent: textContent.trim() }),
        market,
        analystNotes: analystNotes.trim() || null,
      };

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const rawText = await res.text();
      let json;
      try { json = JSON.parse(rawText); }
      catch {
        const hint = res.status === 413 ? " (이미지가 너무 많아요. 10장 이내로 줄여보세요)" : ` (서버 응답 ${res.status})`;
        throw new Error(`응답 파싱 실패${hint}\n\n${rawText.slice(0, 300)}`);
      }
      if (!res.ok) throw new Error(`${json.error || "분석 실패"}${json.detail ? "\n\n" + json.detail : ""}`);

      json.fetchedAt = selectedBatch;
      json.date = selectedDate;
      json.market = market;
      json.issues  = (json.issues || []).map((item, i) => ({ ...item, id: i + 1, tickers: item.tickers || [] }));
      json.picks   = json.picks   || [];
      json.sectors = json.sectors || [];

      setResult(json);
    } catch (e) {
      setError({ msg: "분석 실패", detail: e.message });
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePublish = async () => {
    if (!result) return;
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market,
          date:             selectedDate,
          batch_time:       selectedBatch,
          sentiment:        result.sentiment,
          one_line_summary: result.oneLineSummary,
          summary:          result.summary,
          issues:           result.issues,
          picks:            result.picks,
          sectors:          result.sectors,
          indices:          result.indices || [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "발행 실패");
      setPublished(true);
    } catch (e) {
      setError({ msg: "발행 실패", detail: e.message });
    } finally {
      setPublishing(false);
    }
  };

  if (!authenticated) return <PasswordScreen onSuccess={() => setAuthenticated(true)} />;

  const assetInfo = ASSET_TABS.find(a => a.key === assetTab);
  const accentColor = assetTab === "stock"
    ? (stockMarket === "us" ? "#4d8aff" : "#ff6b35")
    : (assetInfo?.color || "#34d399");
  const marketDisplayName = assetTab === "stock"
    ? (stockMarket === "us" ? "미국 주식" : "한국 주식")
    : assetInfo?.label;
  const totalSizeKB = images.reduce((s, img) => s + (img.sizeKB || 0), 0);

  return (
    <>
    <Head><title>+α 관리자</title></Head>
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", background: "#07080c", minHeight: "100vh", maxWidth: 480, margin: "0 auto", color: "#dde1ea" }}>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07080c; }
        ::-webkit-scrollbar { display: none; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        .fade-up { animation: fadeUp .25s ease both; }
        .tap { cursor: pointer; transition: opacity .1s; user-select: none; }
        .tap:active { opacity: .6; }
      `}</style>

      <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div style={{ fontSize: 9, color: "#ff6b35", letterSpacing: 3, marginBottom: 4, fontWeight: 600 }}>ADMIN · 관리자</div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 20, fontWeight: 800, color: "#34d399", fontStyle: "italic" }}>+α</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 400 }}>콘텐츠 업로드</span>
        </div>
      </div>

      <div style={{ padding: "20px 20px 80px" }}>

        {/* STEP 1 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 12 }}>STEP 1 · 설정</div>

          {/* 자산 카테고리 탭 */}
          <div style={{ display: "flex", gap: 6, marginBottom: 10, overflowX: "auto" }}>
            {ASSET_TABS.map((a) => (
              <button key={a.key} onClick={() => { setAssetTab(a.key); reset(); }} style={{
                flexShrink: 0, padding: "6px 14px", borderRadius: 20, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: assetTab === a.key ? 700 : 500,
                transition: "all 0.18s",
                background: assetTab === a.key ? a.color : "rgba(255,255,255,0.06)",
                color: assetTab === a.key ? (a.key === "realty" || a.key === "frac" ? "#07080c" : "#fff") : "rgba(255,255,255,0.45)",
                boxShadow: assetTab === a.key ? `0 2px 10px ${a.color}44` : "none",
              }}>{a.label}</button>
            ))}
          </div>

          {/* 주식 탭: 미국/한국 토글 */}
          {assetTab === "stock" && (
            <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
              {[{ key: "us", label: "🇺🇸 미국", color: "#4d8aff" }, { key: "kr", label: "🇰🇷 한국", color: "#ff6b35" }].map((m) => (
                <button key={m.key} onClick={() => { setStockMarket(m.key); reset(); }} style={{
                  flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 12, fontWeight: 600, transition: "all 0.2s",
                  background: stockMarket === m.key ? m.color : "rgba(255,255,255,0.05)",
                  color: stockMarket === m.key ? "#fff" : "rgba(255,255,255,0.4)",
                  boxShadow: stockMarket === m.key ? `0 2px 12px ${m.color}44` : "none",
                }}>{m.label}</button>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ width: "100%", padding: "10px 12px", borderRadius: 10, fontFamily: "inherit", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#dde1ea", fontSize: 12, outline: "none", cursor: "pointer" }}>
              {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ background: "#1a1c24" }}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {BATCH_TIMES.map((t) => (
              <button key={t} onClick={() => setSelectedBatch(t)} style={{
                flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 11.5, fontWeight: selectedBatch === t ? 700 : 500,
                transition: "all 0.18s",
                background: selectedBatch === t ? accentColor : "rgba(255,255,255,0.05)",
                color: selectedBatch === t ? (accentColor === "#f5c842" ? "#07080c" : "#fff") : "rgba(255,255,255,0.4)",
                boxShadow: selectedBatch === t ? `0 2px 10px ${accentColor}44` : "none",
              }}>{t}</button>
            ))}
          </div>
        </div>

        {/* STEP 2 — 스크린샷 (모든 탭 공통) */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
              STEP 2 · 스크린샷 ({images.length}/30{images.length > 0 ? ` · ${totalSizeKB}KB` : ""})
            </div>
            {images.length > 0 && <div className="tap" onClick={() => { setImages([]); setResult(null); setPublished(false); }} style={{ fontSize: 10, color: "rgba(255,77,109,0.7)" }}>전체 삭제</div>}
          </div>

          {images.length > 0 && (
            <div style={{ marginBottom: 10, borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden" }}>
              {images.map((img, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderBottom: i < images.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none", background: "rgba(255,255,255,0.02)" }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>🖼️</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{img.name}</div>
                    <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.25)", marginTop: 2 }}>{img.sizeKB} KB</div>
                  </div>
                  <div className="tap" onClick={() => removeImage(i)} style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", padding: "2px 6px", flexShrink: 0 }}>✕</div>
                </div>
              ))}
            </div>
          )}

          {images.length < 30 && (
            <div className="tap" onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              style={{ padding: "14px", borderRadius: 10, border: `2px dashed ${accentColor}55`, background: `${accentColor}06`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
              <span style={{ fontSize: 16 }}>📸</span>
              <span style={{ fontSize: 12, color: accentColor, fontWeight: 600 }}>
                {images.length === 0 ? "스크린샷 추가 (최대 30장)" : `더 추가하기 (${30 - images.length}장 남음)`}
              </span>
            </div>
          )}
          <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />

          <div style={{ marginTop: 8, padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", lineHeight: 1.8 }}>
              💡 뉴스 헤드라인 · 시황 채널 캡처 · 증권사 리포트 · 지수 화면
            </div>
          </div>
        </div>

        {/* STEP 2-B — 텍스트 (선택, 모든 탭 공통) */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
              STEP 2-B · 텍스트 / 링크 <span style={{ color: "rgba(255,255,255,0.18)" }}>(선택)</span>
            </div>
            {textContent && (
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {(() => {
                  const urls = textContent.match(/https?:\/\/[^\s]+/g) || [];
                  return urls.length > 0 && (
                    <span style={{ fontSize: 9.5, color: `${accentColor}99` }}>🔗 링크 {urls.length}개</span>
                  );
                })()}
                <div className="tap" onClick={() => setTextContent("")} style={{ fontSize: 9.5, color: "rgba(255,77,109,0.6)" }}>초기화</div>
              </div>
            )}
          </div>
          <textarea
            value={textContent}
            onChange={(e) => { setTextContent(e.target.value); setResult(null); setPublished(false); }}
            placeholder={`뉴스 헤드라인 텍스트나 URL을 붙여넣으세요.\n스크린샷과 함께 쓰면 AI가 두 소스를 크로스체크합니다.\n\n예) 텔레그램 시황 채널 텍스트 복붙\n    뉴스 기사 제목들 복붙`}
            style={{
              width: "100%",
              minHeight: 120,
              padding: "14px",
              borderRadius: 10,
              border: textContent ? `1px solid ${accentColor}44` : "1px solid rgba(255,255,255,0.08)",
              background: textContent ? `${accentColor}06` : "rgba(255,255,255,0.02)",
              color: "#dde1ea",
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              lineHeight: 1.7,
              resize: "vertical",
              outline: "none",
              transition: "border 0.2s, background 0.2s",
            }}
          />
          {textContent && (
            <div style={{ marginTop: 6, fontSize: 9.5, color: "rgba(255,255,255,0.2)" }}>
              {textContent.length}자 · 스크린샷과 함께 분석됩니다
            </div>
          )}
        </div>

        {/* STEP 2.5 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>STEP 3 · 분석가 리포트 <span style={{ color: "rgba(255,255,255,0.18)" }}>(선택)</span></div>
            {analystNotes && <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.2)" }}>{analystNotes.length}자</div>}
          </div>
          <textarea
            value={analystNotes}
            onChange={(e) => setAnalystNotes(e.target.value)}
            placeholder={"유료 분석가 리포트 요약 내용을 붙여넣으세요.\n여러 리포트는 줄바꿈으로 구분해도 됩니다.\n\nAI 분석 시 이 내용을 함께 참고해 크로스체크합니다."}
            style={{
              width: "100%",
              minHeight: 130,
              padding: "14px",
              borderRadius: 10,
              border: analystNotes
                ? "1px solid rgba(245,200,66,0.35)"
                : "1px solid rgba(255,255,255,0.08)",
              background: analystNotes
                ? "rgba(245,200,66,0.04)"
                : "rgba(255,255,255,0.02)",
              color: "#dde1ea",
              fontSize: 12,
              fontFamily: "'IBM Plex Mono', monospace",
              lineHeight: 1.7,
              resize: "vertical",
              outline: "none",
              transition: "border 0.2s, background 0.2s",
            }}
          />
          {analystNotes && (
            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 9.5, color: "rgba(245,200,66,0.6)" }}>✦ AI 분석 시 참고 자료로 포함됩니다</div>
              <div className="tap" onClick={() => setAnalystNotes("")} style={{ fontSize: 9.5, color: "rgba(255,77,109,0.5)" }}>초기화</div>
            </div>
          )}
        </div>

        {/* STEP 3 */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 12 }}>STEP 4 · AI 분석</div>
          {(() => {
            const hasContent = images.length > 0 || textContent.trim().length > 0 || analystNotes.trim().length > 0;
            const disabled = analyzing || !hasContent;
            const contentLabel = [
              images.length > 0 && `스크린샷 ${images.length}장`,
              textContent.trim() && "텍스트",
              analystNotes.trim() && "리포트",
            ].filter(Boolean).join(" + ") || "";
            return (
              <button onClick={handleAnalyze} disabled={disabled} style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                fontFamily: "inherit", fontSize: 13, fontWeight: 700, transition: "all 0.2s",
                background: disabled ? "rgba(255,255,255,0.06)" : "#34d399",
                color: disabled ? "rgba(255,255,255,0.2)" : "#07080c",
                cursor: disabled ? "not-allowed" : "pointer",
                opacity: (!analyzing && !hasContent) ? 0.4 : 1,
              }}>
                {analyzing
                  ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                      <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                      분석 중...
                    </span>
                  : `✦ 분석하기 (${contentLabel ? `${contentLabel} · ` : ""}${marketDisplayName} ${selectedBatch})`
                }
              </button>
            );
          })()}
        </div>

        {error && (
          <div style={{ marginTop: 10, padding: "12px 14px", borderRadius: 8, background: "rgba(255,77,109,0.08)", border: "1px solid rgba(255,77,109,0.25)" }}>
            <div style={{ fontSize: 12, color: "#ff4d6d", fontWeight: 600, marginBottom: 6 }}>⚠ {error.msg}</div>
            <div style={{ fontSize: 10.5, color: "rgba(255,77,109,0.7)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{error.detail}</div>
          </div>
        )}

        {result && (
          <div className="fade-up">
            <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "24px 0" }} />
            <ResultPreview result={result} market={market} />
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 12 }}>STEP 5 · 서비스 반영</div>
              {published ? (
                <div>
                  <div style={{ padding: "14px 0", borderRadius: 12, background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#34d399", marginBottom: 10 }}>
                    ✅ 분석 완료!
                  </div>
                  <a href="/" style={{ display: "block", textDecoration: "none" }}>
                    <div style={{
                      padding: "13px 0", borderRadius: 12, border: "1px solid rgba(52,211,153,0.35)",
                      textAlign: "center", fontSize: 13, fontWeight: 700, color: "#34d399",
                      background: "rgba(52,211,153,0.06)", cursor: "pointer",
                    }}>
                      메인에서 확인하기 →
                    </div>
                  </a>
                </div>
              ) : (
                <button onClick={handlePublish} disabled={publishing} style={{
                  width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700, transition: "all 0.2s",
                  background: publishing ? "rgba(255,255,255,0.06)" : accentColor,
                  color: publishing ? "rgba(255,255,255,0.3)" : "#fff",
                  cursor: publishing ? "not-allowed" : "pointer",
                  boxShadow: !publishing ? `0 4px 20px ${accentColor}44` : "none",
                }}>
                  {publishing ? "발행 중..." : `🚀 서비스에 발행 (${marketDisplayName} · ${selectedDate} · ${selectedBatch})`}
                </button>
              )}
              {published && (
                <div className="tap" onClick={reset} style={{ marginTop: 10, textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.3)", padding: "8px 0" }}>+ 다음 업로드</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
