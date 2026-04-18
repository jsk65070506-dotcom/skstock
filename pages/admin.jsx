// pages/admin.jsx
import React, { useState, useRef } from "react";

const toBase64 = (file) => new Promise((res, rej) => {
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const MAX = 1600;
    let w = img.width, h = img.height;
    if (w > MAX || h > MAX) {
      if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
      else { w = Math.round(w * MAX / h); h = MAX; }
    }
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
    URL.revokeObjectURL(url);
    res(canvas.toDataURL("image/jpeg", 0.82).split(",")[1]);
  };
  img.onerror = rej;
  img.src = url;
});

const actionColor = (a) =>
  a === "BUY" ? "#00e5a0" : a === "SELL" ? "#ff4d6d" : "#f5c842";

const BATCH_TIMES = ["09:00", "13:00", "18:00", "23:00"];
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
        background: result.sentiment === "bullish" ? "rgba(0,229,160,0.12)" : "rgba(255,77,109,0.12)",
        color: result.sentiment === "bullish" ? "#00e5a0" : "#ff4d6d",
        border: `1px solid ${result.sentiment === "bullish" ? "rgba(0,229,160,0.3)" : "rgba(255,77,109,0.3)"}`,
      }}>
        {result.sentiment === "bullish" ? "▲ 강세" : "▼ 약세"}
      </span>
      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)" }}>{result.oneLineSummary}</span>
    </div>

    <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(0,229,160,0.04)", border: "1px solid rgba(0,229,160,0.15)", marginBottom: 12 }}>
      <p style={{ fontSize: 12, lineHeight: 1.7, color: "rgba(255,255,255,0.7)", margin: 0 }}>{result.summary}</p>
    </div>

    {result.issues?.length > 0 && (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>📰 이슈 {result.issues.length}건</div>
        {result.issues.map((item, i) => (
          <div key={i} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.07)", background: "rgba(255,255,255,0.02)", marginBottom: 6 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, fontWeight: 600, background: item.sentiment === "bullish" ? "rgba(0,229,160,0.1)" : "rgba(255,77,109,0.1)", color: item.sentiment === "bullish" ? "#00e5a0" : "#ff4d6d" }}>{item.sentiment === "bullish" ? "▲" : "▼"}</span>
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
              <div style={{ width: `${s.score}%`, height: "100%", borderRadius: 2, background: s.score > 70 ? "#00e5a0" : s.score > 50 ? "#f5c842" : "#ff4d6d" }} />
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", width: 22, textAlign: "right", flexShrink: 0 }}>{s.score}</span>
            <span style={{ fontSize: 10, color: s.trend?.startsWith("▲") ? "#00e5a0" : "#ff4d6d", width: 60, textAlign: "right", flexShrink: 0 }}>{s.trend}</span>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ── MAIN ────────────────────────────────────────────────────────────────────
export default function MarketAdmin() {
  const [market, setMarket] = useState("us");
  const [selectedDate, setSelectedDate] = useState(DATE_OPTIONS[0].value);
  const [selectedBatch, setSelectedBatch] = useState(BATCH_TIMES[0]);
  const [images, setImages] = useState([]);
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
  const reset = () => { setImages([]); setAnalystNotes(""); setResult(null); setPublished(false); setError(null); };

  const handleAnalyze = async () => {
    if (!images.length) return;
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: images.map((img) => ({ base64: img.base64, mediaType: img.mediaType })),
          market,
          analystNotes: analystNotes.trim() || null,
        }),
      });

      const json = await res.json();
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

  const accentColor = market === "us" ? "#4d8aff" : "#ff6b35";
  const totalSizeKB = images.reduce((s, img) => s + (img.sizeKB || 0), 0);

  return (
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
        <div style={{ fontSize: 17, fontWeight: 700 }}>꾸기 Market 업로드</div>
      </div>

      <div style={{ padding: "20px 20px 80px" }}>

        {/* STEP 1 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 12 }}>STEP 1 · 설정</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            {[{ key: "us", label: "🇺🇸 미국", color: "#4d8aff" }, { key: "kr", label: "🇰🇷 한국", color: "#ff6b35" }].map((m) => (
              <button key={m.key} onClick={() => { setMarket(m.key); reset(); }} style={{
                flex: 1, padding: "9px 0", borderRadius: 10, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12, fontWeight: 600, transition: "all 0.2s",
                background: market === m.key ? m.color : "rgba(255,255,255,0.05)",
                color: market === m.key ? "#fff" : "rgba(255,255,255,0.4)",
                boxShadow: market === m.key ? `0 2px 12px ${m.color}44` : "none",
              }}>{m.label}</button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, fontFamily: "inherit", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#dde1ea", fontSize: 12, outline: "none", cursor: "pointer" }}>
              {DATE_OPTIONS.map((o) => <option key={o.value} value={o.value} style={{ background: "#1a1c24" }}>{o.label}</option>)}
            </select>
            <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)} style={{ flex: 1, padding: "10px 12px", borderRadius: 10, fontFamily: "inherit", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#dde1ea", fontSize: 12, outline: "none", cursor: "pointer" }}>
              {BATCH_TIMES.map((t) => <option key={t} value={t} style={{ background: "#1a1c24" }}>{t} 배치</option>)}
            </select>
          </div>
        </div>

        {/* STEP 2 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>
              STEP 2 · 스크린샷 ({images.length}/30{images.length > 0 ? ` · ${totalSizeKB}KB` : ""})
            </div>
            {images.length > 0 && <div className="tap" onClick={reset} style={{ fontSize: 10, color: "rgba(255,77,109,0.7)" }}>전체 초기화</div>}
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
              style={{ padding: "14px", borderRadius: 10, border: "2px dashed rgba(0,229,160,0.3)", background: "rgba(0,229,160,0.03)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
              <span style={{ fontSize: 16 }}>📸</span>
              <span style={{ fontSize: 12, color: "#00e5a0", fontWeight: 600 }}>
                {images.length === 0 ? "스크린샷 추가 (최대 30장)" : `더 추가하기 (${30 - images.length}장 남음)`}
              </span>
            </div>
          )}

          <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={(e) => handleFiles(e.target.files)} />

          <div style={{ marginTop: 8, padding: "9px 12px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", lineHeight: 1.8 }}>
              💡 뉴스 헤드라인 · 증권사 리포트 · 지수 화면 · 시황 채널 캡처
            </div>
          </div>
        </div>

        {/* STEP 2.5 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1 }}>STEP 2.5 · 분석가 리포트 <span style={{ color: "rgba(255,255,255,0.18)" }}>(선택)</span></div>
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
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 12 }}>STEP 3 · AI 분석</div>
          <button onClick={handleAnalyze} disabled={!images.length || analyzing} style={{
            width: "100%", padding: "14px 0", borderRadius: 12, border: "none",
            fontFamily: "inherit", fontSize: 13, fontWeight: 700, transition: "all 0.2s",
            background: (!images.length || analyzing) ? "rgba(255,255,255,0.06)" : "#00e5a0",
            color: (!images.length || analyzing) ? "rgba(255,255,255,0.2)" : "#07080c",
            cursor: (!images.length || analyzing) ? "not-allowed" : "pointer",
          }}>
            {analyzing
              ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>⟳</span>
                  {images.length}장 분석 중...
                </span>
              : images.length
                ? `✦ 분석하기 (${images.length}장 · ${market === "us" ? "미국" : "한국"} ${selectedBatch})`
                : "스크린샷을 먼저 추가하세요"
            }
          </button>
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
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: 1, marginBottom: 12 }}>STEP 4 · 서비스 반영</div>
              {published ? (
                <div style={{ padding: "14px 0", borderRadius: 12, background: "rgba(0,229,160,0.08)", border: "1px solid rgba(0,229,160,0.25)", textAlign: "center", fontSize: 13, fontWeight: 700, color: "#00e5a0" }}>
                  ✓ 발행 완료
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
                  {publishing ? "발행 중..." : `🚀 서비스에 발행 (${selectedDate} · ${selectedBatch})`}
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
  );
}
