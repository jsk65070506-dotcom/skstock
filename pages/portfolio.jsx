// pages/portfolio.jsx — v3: 한글검색·자동현재가·환율토글
import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

// ── 샘플 데이터 ─────────────────────────────────────────────────
const SAMPLE_DATA = [
  { id: 1, type: "us",   name: "NVIDIA",  ticker: "NVDA",   amount: 3000000, targetRatio: 30, currentPriceOriginal: 950,   buyPriceOriginal: 800,  qty: 2,  originalCurrency: "USD" },
  { id: 2, type: "us",   name: "Apple",   ticker: "AAPL",   amount: 2000000, targetRatio: 25, currentPriceOriginal: 180,   buyPriceOriginal: 170,  qty: 8,  originalCurrency: "USD" },
  { id: 3, type: "kr",   name: "삼성전자", ticker: "005930", amount: 2500000, targetRatio: 25, currentPriceOriginal: 78000, buyPriceOriginal: 70000,qty: 32, originalCurrency: "KRW" },
  { id: 4, type: "cash", name: "현금",     ticker: null,     amount: 1500000, targetRatio: 20, currentPriceOriginal: null,  buyPriceOriginal: null, qty: null,originalCurrency: "KRW" },
];

const ASSET_TYPES = [
  { key: "us",    label: "미국주식",  emoji: "🇺🇸", needsSearch: true,  origCurrency: "USD" },
  { key: "kr",    label: "한국주식",  emoji: "🇰🇷", needsSearch: true,  origCurrency: "KRW" },
  { key: "cash",  label: "현금·예금", emoji: "💵",  needsSearch: false, origCurrency: "KRW" },
  { key: "other", label: "기타자산",  emoji: "🏠",  needsSearch: false, origCurrency: "KRW" },
];

// ── 포맷 helpers ────────────────────────────────────────────────
const fmtInt = (n) => new Intl.NumberFormat("ko-KR").format(Math.round(n || 0));
const fmtKRW = (n) => "₩" + fmtInt(n);
const fmtUSD = (n) => "$" + new Intl.NumberFormat("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n || 0));

// KRW 기준 내부 금액 → 표시 통화로 변환
function toDisplay(krwAmount, currency, usdKrw) {
  if (!krwAmount) return currency === "USD" ? "$0" : "₩0";
  if (currency === "USD") return fmtUSD(krwAmount / usdKrw);
  return fmtKRW(krwAmount);
}

// ── 타입 선택 바텀시트 ─────────────────────────────────────────
const TypePickerSheet = ({ onClose, onPick }) => (
  <>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 90, backdropFilter: "blur(4px)" }} />
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480, zIndex: 100,
      background: "#0f1117", borderRadius: "20px 20px 0 0",
      border: "1px solid rgba(255,255,255,0.09)",
      animation: "slideUp 0.28s cubic-bezier(.32,1.2,.5,1) both",
    }}>
      <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 4px" }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
      </div>
      <div style={{ padding: "12px 20px 40px" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>어떤 자산을 추가할까요?</div>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginBottom: 20 }}>유형에 따라 입력 방식이 달라집니다</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {ASSET_TYPES.map((t) => (
            <div key={t.key} className="tap" onClick={() => onPick(t)} style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "14px 16px", borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)",
            }}>
              <span style={{ fontSize: 24 }}>{t.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#dde1ea" }}>{t.label}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                  {t.needsSearch ? "한글·티커 검색 + 현재가 자동 입력" : "이름·금액 직접 입력"}
                </div>
              </div>
              <span style={{ fontSize: 16, color: "rgba(255,255,255,0.3)" }}>›</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);

// ── 종목 검색 자동완성 ─────────────────────────────────────────
const StockSearchInput = ({ market, onSelect }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    clearTimeout(timer.current);
    if (!v.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-stock?q=${encodeURIComponent(v)}&market=${market}`);
        const data = await res.json();
        setResults(data.quotes || []);
        setOpen(true);
      } catch { setResults([]); }
      finally { setLoading(false); }
    }, 300);
  };

  const pick = (item) => {
    setQuery("");
    setOpen(false);
    setResults([]);
    onSelect(item);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text" value={query} onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={market === "us" ? "테슬라, TSLA, 엔비디아 ..." : "삼성전자, 005930 ..."}
        style={{
          width: "100%", padding: "12px 14px", borderRadius: 10,
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          color: "#dde1ea", fontSize: 13, fontFamily: "inherit", outline: "none",
        }}
      />
      {loading && <span style={{ position: "absolute", right: 12, top: 13, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>⟳</span>}
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
          background: "#13151e", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, overflow: "hidden", zIndex: 50, maxHeight: 260, overflowY: "auto",
        }}>
          {results.map((item, i) => {
            const name = item.shortname || item.longname || item.symbol;
            return (
              <div key={item.symbol + i} className="tap" onClick={() => pick(item)} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "11px 14px",
                borderBottom: i < results.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
                <span style={{ fontSize: 13, color: "#dde1ea", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                  {name}
                </span>
                <span style={{
                  fontSize: 11, color: "#00e5a0", marginLeft: 10, flexShrink: 0,
                  background: "rgba(0,229,160,0.1)", padding: "2px 7px", borderRadius: 5, fontWeight: 600,
                }}>
                  {item.symbol}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── 자산 추가 폼 ────────────────────────────────────────────────
const AddAssetForm = ({ type, onCancel, onSave, totalTargetRatio, usdKrw }) => {
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [priceOriginal, setPriceOriginal] = useState(null); // 원래 통화 기준 가격
  const [priceLoading, setPriceLoading] = useState(false);
  const [qty, setQty] = useState("");
  const [amount, setAmount] = useState(""); // KRW 기준 (수동 입력용 or 자동 계산)
  const [buyPrice, setBuyPrice] = useState("");
  const [targetRatio, setTargetRatio] = useState("");

  const needsSearch = type.needsSearch;
  const isUS = type.key === "us";

  // 자동 계산: 가격 × 수량 × (환율 if USD) = KRW 기준 amount
  useEffect(() => {
    if (needsSearch && priceOriginal && qty) {
      const krw = isUS
        ? priceOriginal * Number(qty) * usdKrw
        : priceOriginal * Number(qty);
      setAmount(String(Math.round(krw)));
    }
  }, [priceOriginal, qty, isUS, usdKrw, needsSearch]);

  const handleSelect = async (item) => {
    setName(item.shortname || item.longname || item.symbol);
    setTicker(item.symbol);
    setPriceOriginal(null);
    setPriceLoading(true);
    try {
      const res = await fetch(`/api/stock-price?symbol=${encodeURIComponent(item.symbol)}`);
      const data = await res.json();
      if (data.price) setPriceOriginal(data.price);
    } catch { /* silent */ }
    finally { setPriceLoading(false); }
  };

  const ratioNum = Number(targetRatio || 0);
  const totalWithThis = totalTargetRatio + ratioNum;
  const remaining = 100 - totalWithThis;

  let ratioMsg = null;
  if (targetRatio) {
    if (totalWithThis > 100)        ratioMsg = { text: "목표 비율 합계가 100%를 초과했어요", color: "#ff4d6d" };
    else if (totalWithThis === 100) ratioMsg = { text: "✓ 목표 비율이 완성됐어요", color: "#00e5a0" };
    else                            ratioMsg = { text: `설정된 목표: ${totalWithThis}% / 남은: ${remaining}%`, color: "rgba(255,255,255,0.5)" };
  } else {
    ratioMsg = { text: `현재 설정: ${totalTargetRatio}% / 남은: ${100 - totalTargetRatio}%`, color: "rgba(255,255,255,0.5)" };
  }

  const canSave = name.trim() && (needsSearch ? amount && Number(amount) > 0 : amount && Number(amount) > 0) && targetRatio;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      type: type.key,
      name: name.trim(),
      ticker: ticker || null,
      amount: Number(amount),
      buyPriceOriginal: buyPrice ? Number(buyPrice) : null,
      currentPriceOriginal: priceOriginal,
      qty: qty ? Number(qty) : null,
      targetRatio: Number(targetRatio),
      originalCurrency: type.origCurrency,
    });
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
    color: "#dde1ea", fontSize: 13, fontFamily: "inherit", outline: "none",
  };
  const labelStyle = { fontSize: 10.5, color: "rgba(255,255,255,0.45)", marginBottom: 6, display: "block" };

  // 현재가 표시 포맷
  const priceLabel = priceOriginal
    ? (isUS ? `$${priceOriginal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (₩${fmtInt(priceOriginal * usdKrw)})` : `₩${fmtInt(priceOriginal)}`)
    : null;

  return (
    <div className="fade-up" style={{
      borderRadius: 12, border: "1px solid rgba(255,255,255,0.09)",
      background: "rgba(255,255,255,0.02)", padding: "16px", marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <span style={{ fontSize: 20 }}>{type.emoji}</span>
        <div style={{ fontSize: 13, fontWeight: 600 }}>{type.label} 추가</div>
      </div>

      {/* 자산명 */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>자산명 {needsSearch && "(한글 또는 티커 검색)"}</label>
        {needsSearch ? (
          <>
            <StockSearchInput market={type.key} onSelect={handleSelect} />
            {/* 선택된 종목 표시 */}
            {name && (
              <div style={{
                marginTop: 8, padding: "8px 12px", borderRadius: 8,
                background: "rgba(0,229,160,0.07)", border: "1px solid rgba(0,229,160,0.2)",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#dde1ea", flex: 1 }}>{name}</span>
                {ticker && (
                  <span style={{ fontSize: 11, color: "#00e5a0", background: "rgba(0,229,160,0.12)", padding: "2px 8px", borderRadius: 5, fontWeight: 700 }}>
                    {ticker}
                  </span>
                )}
              </div>
            )}
          </>
        ) : (
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={type.key === "cash" ? "예: 보통예금, CMA" : "예: 비트코인, 금"}
            style={inputStyle} />
        )}
      </div>

      {/* 현재가 자동 표시 (주식일 때, 입력 필드 없음) */}
      {needsSearch && (
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>현재가 (자동)</label>
          <div style={{
            padding: "11px 14px", borderRadius: 10,
            background: priceLoading ? "rgba(255,255,255,0.03)" : priceLabel ? "rgba(0,229,160,0.05)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${priceLabel ? "rgba(0,229,160,0.2)" : "rgba(255,255,255,0.07)"}`,
            fontSize: 13, fontWeight: 600,
            color: priceLabel ? "#00e5a0" : "rgba(255,255,255,0.3)",
            minHeight: 44, display: "flex", alignItems: "center",
          }}>
            {priceLoading ? "조회 중..." : priceLabel || (name ? "가격 조회 실패 — 수량 직접 입력" : "종목 검색 후 자동 입력")}
          </div>
        </div>
      )}

      {/* 수량 (주식) */}
      {needsSearch && (
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>수량 (보유 주식 수)</label>
          <input type="number" value={qty} onChange={(e) => setQty(e.target.value)}
            placeholder="예: 5" style={inputStyle} />
        </div>
      )}

      {/* 평가금액 */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          {needsSearch ? "평가금액 (원화 기준, 자동 계산)" : "금액 (원화 기준)"}
        </label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          readOnly={needsSearch && priceOriginal && qty}
          placeholder={needsSearch ? "수량 입력 시 자동 계산" : "보유 금액 (원)"}
          style={{
            ...inputStyle,
            background: needsSearch && priceOriginal && qty ? "rgba(0,229,160,0.05)" : "rgba(255,255,255,0.05)",
            border: `1px solid ${needsSearch && priceOriginal && qty ? "rgba(0,229,160,0.25)" : "rgba(255,255,255,0.1)"}`,
            color: needsSearch && priceOriginal && qty ? "#00e5a0" : "#dde1ea",
            fontWeight: 600,
          }} />
        {needsSearch && priceOriginal && qty && amount && (
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
            {isUS ? `$${fmtInt(priceOriginal)} × ${qty}주 × ₩${fmtInt(usdKrw)}` : `₩${fmtInt(priceOriginal)} × ${qty}주`}
          </div>
        )}
      </div>

      {/* 평균 매입가 (선택) */}
      {needsSearch && (
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>
            평균 매입가 (선택 · {isUS ? "달러" : "원화"} 기준)
          </label>
          <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)}
            placeholder={isUS ? "예: 220.50" : "예: 72000"}
            style={inputStyle} />
        </div>
      )}

      {/* 목표 비율 */}
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>목표 비율 (%)</label>
        <input type="number" value={targetRatio} onChange={(e) => setTargetRatio(e.target.value)}
          placeholder="예: 30" style={inputStyle} />
        <div style={{ fontSize: 11, color: ratioMsg.color, marginTop: 8, lineHeight: 1.5 }}>{ratioMsg.text}</div>
      </div>

      {/* 버튼 */}
      <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
        <button onClick={onCancel} style={{
          flex: 1, padding: "11px 0", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.55)",
          fontFamily: "inherit", fontSize: 12, cursor: "pointer",
        }}>취소</button>
        <button onClick={handleSave} disabled={!canSave} style={{
          flex: 2, padding: "11px 0", borderRadius: 10, border: "none",
          background: canSave ? "#00e5a0" : "rgba(255,255,255,0.06)",
          color: canSave ? "#07080c" : "rgba(255,255,255,0.25)",
          fontFamily: "inherit", fontSize: 13, fontWeight: 700,
          cursor: canSave ? "pointer" : "not-allowed",
        }}>저장</button>
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
        ⚠ 정보 제공 목적 · 투자 결정은 본인 책임
      </div>
    </div>
  );
};

// ── 자산 카드 ───────────────────────────────────────────────────
const AssetCard = ({ asset, currentRatio, onRemove, currency, usdKrw }) => {
  const diff = currentRatio - asset.targetRatio;
  const diffColor = Math.abs(diff) < 1 ? "#00e5a0" : diff > 0 ? "#f5c842" : "#ff4d6d";

  const isUS = asset.originalCurrency === "USD";

  // 수익 계산 (원화 기준)
  let profitInfo = null;
  if (asset.buyPriceOriginal && asset.currentPriceOriginal && asset.qty) {
    const profitOriginal = (asset.currentPriceOriginal - asset.buyPriceOriginal) * asset.qty;
    const profitKRW = isUS ? profitOriginal * usdKrw : profitOriginal;
    const profitRate = ((asset.currentPriceOriginal - asset.buyPriceOriginal) / asset.buyPriceOriginal) * 100;
    profitInfo = {
      display: toDisplay(Math.abs(profitKRW), currency, usdKrw),
      rate: profitRate,
      isPos: profitKRW >= 0,
      color: profitKRW >= 0 ? "#00e5a0" : "#ff4d6d",
    };
  }

  const typeInfo = ASSET_TYPES.find(t => t.key === asset.type) || {};

  return (
    <div style={{
      padding: "14px 15px", borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.02)", marginBottom: 10,
    }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14 }}>{typeInfo.emoji}</span>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#dde1ea" }}>{asset.name}</div>
            {asset.ticker && (
              <span style={{
                fontSize: 10, color: "#00e5a0", background: "rgba(0,229,160,0.1)",
                padding: "1px 6px", borderRadius: 4, fontWeight: 600,
              }}>{asset.ticker}</span>
            )}
          </div>
          {asset.qty && (
            <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)" }}>{asset.qty}주</div>
          )}
        </div>
        <div className="tap" onClick={() => onRemove(asset.id)} style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", padding: "2px 6px" }}>✕</div>
      </div>

      {/* 평가금액 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>평가금액</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "#dde1ea" }}>
          {toDisplay(asset.amount, currency, usdKrw)}
        </span>
      </div>

      {/* 수익률 */}
      {profitInfo && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>수익</span>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: profitInfo.color }}>
              {profitInfo.isPos ? "+" : "-"}{profitInfo.display}
            </div>
            <div style={{ fontSize: 10.5, color: profitInfo.color, marginTop: 1 }}>
              {profitInfo.rate >= 0 ? "+" : ""}{profitInfo.rate.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      {/* 비율 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>현재 / 목표</span>
        <span>
          <span style={{ color: "#dde1ea", fontWeight: 600 }}>{currentRatio.toFixed(1)}%</span>
          <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 4px" }}>/</span>
          <span style={{ color: "rgba(255,255,255,0.55)" }}>{asset.targetRatio}%</span>
          <span style={{ color: diffColor, marginLeft: 8, fontWeight: 600 }}>
            {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
          </span>
        </span>
      </div>
    </div>
  );
};

// ── MAIN ────────────────────────────────────────────────────────
export default function Portfolio() {
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [isSample, setIsSample] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  // 환율 토글
  const [currency, setCurrency] = useState("KRW");
  const [usdKrw, setUsdKrw] = useState(1380);

  // 환율 조회 (마운트 시 1회)
  useEffect(() => {
    fetch("/api/stock-price?symbol=USDKRW%3DX")
      .then(r => r.json())
      .then(d => { if (d.price) setUsdKrw(d.price); })
      .catch(() => {});
  }, []);

  const total = assets.reduce((s, a) => s + a.amount, 0);
  const totalTargetRatio = assets.reduce((s, a) => s + (a.targetRatio || 0), 0);

  const handleSave = (newAsset) => {
    setAssets(prev => [...prev, { ...newAsset, id: Date.now() }]);
    setSelectedType(null);
  };
  const handleRemove = (id) => setAssets(prev => prev.filter(a => a.id !== id));
  const loadSample = () => { setAssets(SAMPLE_DATA); setIsSample(true); };
  const clearSample = () => { setAssets([]); setIsSample(false); };
  const isEmpty = assets.length === 0;

  return (
    <>
      <Head><title>+α | 포트폴리오 진단</title></Head>

      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        background: "#07080c", minHeight: "100vh",
        maxWidth: 480, margin: "0 auto", color: "#dde1ea",
        paddingBottom: isEmpty ? 120 : 40,
      }}>
        <style jsx global>{`
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #07080c; }
          ::-webkit-scrollbar { display: none; }
          @keyframes fadeUp  { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
          @keyframes slideUp { from{transform:translateX(-50%) translateY(100%)} to{transform:translateX(-50%) translateY(0)} }
          .fade-up { animation: fadeUp .28s ease both; }
          .tap { cursor: pointer; transition: opacity .1s; }
          .tap:active { opacity: .6; }
          input:focus { border-color: rgba(0,229,160,0.4) !important; outline: none; }
          input::placeholder { color: rgba(255,255,255,0.2); }
          input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        `}</style>

        {/* HEADER */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div className="tap" onClick={() => router.push("/")} style={{
              fontSize: 12, color: "rgba(255,255,255,0.4)",
              display: "inline-flex", alignItems: "center", gap: 4,
            }}>← 시황</div>

            {/* 환율 토글 버튼 */}
            <button onClick={() => setCurrency(c => c === "KRW" ? "USD" : "KRW")} style={{
              padding: "5px 12px", borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.12)",
              background: currency === "USD" ? "rgba(0,229,160,0.12)" : "rgba(255,255,255,0.05)",
              color: currency === "USD" ? "#00e5a0" : "rgba(255,255,255,0.6)",
              fontSize: 12, fontWeight: 700, fontFamily: "inherit", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 5,
            }}>
              <span>{currency === "KRW" ? "₩" : "$"}</span>
              <span>{currency}</span>
              <span style={{ opacity: 0.5, fontSize: 10 }}>⇄</span>
            </button>
          </div>

          <div style={{ fontSize: 10, color: "#00e5a0", letterSpacing: 3, marginBottom: 3, fontWeight: 500 }}>+α PORTFOLIO</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <div style={{ fontSize: 19, fontWeight: 700, letterSpacing: -0.5 }}>포트폴리오 진단</div>
            {currency === "USD" && usdKrw > 0 && (
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                $1 = ₩{fmtInt(usdKrw)}
              </div>
            )}
          </div>
        </div>

        {/* 샘플 뱃지 */}
        {isSample && (
          <div className="tap" onClick={clearSample} style={{
            margin: "12px 16px 0", padding: "9px 12px", borderRadius: 8,
            background: "rgba(245,200,66,0.08)", border: "1px solid rgba(245,200,66,0.22)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 11, color: "#f5c842" }}>샘플 데이터 보는 중</span>
            <span style={{ fontSize: 11, color: "#f5c842", fontWeight: 600 }}>내 자산 입력하기 →</span>
          </div>
        )}

        {/* BODY */}
        <div style={{ padding: "16px" }}>
          {/* 요약 */}
          {!isEmpty && (
            <div style={{ marginBottom: 16, padding: "14px 16px", borderRadius: 12, background: "rgba(0,229,160,0.05)", border: "1px solid rgba(0,229,160,0.15)" }}>
              <div style={{ fontSize: 10, color: "#00e5a0", letterSpacing: 1, marginBottom: 6 }}>총 평가금액</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#dde1ea" }}>
                {toDisplay(total, currency, usdKrw)}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                {assets.length}개 자산 · 목표 비율 합계 {totalTargetRatio}%
              </div>
            </div>
          )}

          {/* 입력 폼 */}
          {selectedType && (
            <AddAssetForm
              type={selectedType}
              onCancel={() => setSelectedType(null)}
              onSave={handleSave}
              totalTargetRatio={totalTargetRatio}
              usdKrw={usdKrw}
            />
          )}

          {/* 자산 리스트 */}
          {!isEmpty && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>내 자산</div>
                {!selectedType && (
                  <div className="tap" onClick={() => setShowTypePicker(true)} style={{
                    fontSize: 12, color: "#00e5a0", fontWeight: 600,
                    padding: "4px 10px", borderRadius: 6,
                    background: "rgba(0,229,160,0.08)", border: "1px solid rgba(0,229,160,0.25)",
                  }}>+ 추가</div>
                )}
              </div>
              {assets.map(asset => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  currentRatio={total > 0 ? (asset.amount / total) * 100 : 0}
                  onRemove={handleRemove}
                  currency={currency}
                  usdKrw={usdKrw}
                />
              ))}
            </>
          )}

          {/* 빈 상태 */}
          {isEmpty && !selectedType && (
            <div className="fade-up" style={{ padding: "24px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>보유 자산을 추가해보세요</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", lineHeight: 1.75, marginBottom: 24 }}>
                자산명, 현재 금액, 목표 비율을 입력하면<br />현재 배분과의 편차를 바로 확인할 수 있어요
              </div>
              <button onClick={() => setShowTypePicker(true)} style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                background: "#00e5a0", color: "#07080c", marginBottom: 10,
              }}>+ 자산 추가하기</button>
              <button onClick={loadSample} style={{
                width: "100%", padding: "12px 0", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
                background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)",
              }}>📋 샘플로 먼저 보기</button>
            </div>
          )}
        </div>

        {/* 면책 고정 (빈 상태) */}
        {isEmpty && !selectedType && (
          <div style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 480, zIndex: 40,
            background: "rgba(7,8,12,0.97)", backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            padding: "12px 16px 24px",
          }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, textAlign: "center" }}>
              ℹ️ +α는 투자자문업자가 아니며, 본 도구는 정보 제공 목적의 자산 배분 시각화 서비스입니다.<br />
              투자 결정과 그에 따른 결과는 이용자 본인의 책임입니다.
            </div>
          </div>
        )}

        {/* 타입 선택 바텀시트 */}
        {showTypePicker && (
          <TypePickerSheet
            onClose={() => setShowTypePicker(false)}
            onPick={(t) => { setShowTypePicker(false); setSelectedType(t); }}
          />
        )}
      </div>
    </>
  );
}
