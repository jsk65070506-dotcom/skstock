// pages/portfolio.jsx — Brand V1 + 전면 개편
import React, { useState, useEffect, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

const SAMPLE_DATA = [
  { id: 1, type: "us",   name: "NVIDIA",   ticker: "NVDA",   currentPrice: 950,    qty: 2,   amount: 3000000, buyPrice: 800,    targetRatio: 30 },
  { id: 2, type: "us",   name: "Apple",    ticker: "AAPL",   currentPrice: 180,    qty: 8,   amount: 2000000, buyPrice: 170,    targetRatio: 25 },
  { id: 3, type: "kr",   name: "삼성전자",  ticker: "005930", currentPrice: 78000,  qty: 32,  amount: 2500000, buyPrice: 70000,  targetRatio: 25 },
  { id: 4, type: "cash", name: "현금",      ticker: null,     currentPrice: null,   qty: null,amount: 1500000, buyPrice: null,   targetRatio: 20 },
];

const ASSET_TYPES = [
  { key: "us",    label: "미국주식",   mark: "US", dot: "#34D399", needsSearch: true  },
  { key: "kr",    label: "한국주식",   mark: "KR", dot: "#6B8CC7", needsSearch: true  },
  { key: "cash",  label: "현금·예금",  mark: "$",  dot: "#B8A97A", needsSearch: false },
  { key: "other", label: "기타자산",   mark: "•",  dot: "#8A9B8E", needsSearch: false },
];

const fmt = (n) => new Intl.NumberFormat("ko-KR").format(Math.round(n || 0));
const fmtMoney = (n) => fmt(n) + "원";

const numInputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#E8EFE9", fontSize: 13,
  fontFamily: "'JetBrains Mono', ui-monospace, Menlo, monospace",
  outline: "none",
};

const textInputStyle = {
  width: "100%", padding: "12px 14px", borderRadius: 10,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#E8EFE9", fontSize: 13, fontFamily: "inherit", outline: "none",
};

const TypePickerSheet = ({ onClose, onPick }) => (
  <>
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 90, backdropFilter: "blur(4px)" }} />
    <div style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480, zIndex: 100,
      background: "#0F1C16", borderRadius: "20px 20px 0 0",
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
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(255,255,255,0.03)",
            }}>
              <span style={{
                width: 36, height: 36, borderRadius: 8,
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${t.dot}40`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12, fontWeight: 600, color: t.dot,
                letterSpacing: "0.04em",
              }}>{t.mark}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#E8EFE9" }}>{t.label}</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
                  {t.needsSearch ? "종목 검색 + 현재가 자동 입력" : "이름·금액 직접 입력"}
                </div>
              </div>
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", fontFamily: "'JetBrains Mono', monospace" }}>→</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </>
);

const StockSearchInput = ({ market, onSelect, value, onChangeName }) => {
  const [query, setQuery] = useState(value || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);

  useEffect(() => { setQuery(value || ""); }, [value]);

  const handleChange = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChangeName?.(v);
    clearTimeout(timer.current);
    if (!v.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search-stock?q=${encodeURIComponent(v)}&market=${market}`);
        const data = await res.json();
        setResults(data.quotes || []);
        setOpen(true);
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const pick = (item) => {
    setQuery(item.shortname || item.longname || item.symbol);
    setOpen(false);
    onSelect(item);
  };

  return (
    <div style={{ position: "relative" }}>
      <input
        type="text" value={query} onChange={handleChange}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder={market === "us" ? "NVIDIA, AAPL, 테슬라 ..." : "삼성전자, 005930 ..."}
        style={textInputStyle}
      />
      {loading && <span style={{ position: "absolute", right: 12, top: 12, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>⟳</span>}
      {open && results.length > 0 && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
          background: "#122019", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, overflow: "hidden", zIndex: 50,
          maxHeight: 280, overflowY: "auto",
        }}>
          {results.map((item, i) => (
            <div key={item.symbol + i} className="tap" onClick={() => pick(item)}
              style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px",
                borderBottom: i < results.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}>
              <span style={{ fontSize: 12.5, color: "#E8EFE9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {item.shortname || item.longname || item.symbol}
              </span>
              <span className="num" style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginLeft: 12, flexShrink: 0 }}>
                {item.symbol}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AddAssetForm = ({ type, onCancel, onSave, totalTargetRatio }) => {
  const [name, setName] = useState("");
  const [ticker, setTicker] = useState("");
  const [currentPrice, setCurrentPrice] = useState("");
  const [priceLoading, setPriceLoading] = useState(false);
  const [qty, setQty] = useState("");
  const [amount, setAmount] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [targetRatio, setTargetRatio] = useState("");

  const needsSearch = type.needsSearch;

  useEffect(() => {
    if (needsSearch && currentPrice && qty) {
      setAmount(String(Number(currentPrice) * Number(qty)));
    }
  }, [currentPrice, qty, needsSearch]);

  const handleSelect = async (item) => {
    setName(item.shortname || item.longname || item.symbol);
    setTicker(item.symbol);
    setCurrentPrice("");
    setPriceLoading(true);
    try {
      const res = await fetch(`/api/stock-price?symbol=${encodeURIComponent(item.symbol)}`);
      const data = await res.json();
      if (data.price) setCurrentPrice(String(data.price));
    } catch (e) {
      // silent — 수동 입력 가능
    } finally {
      setPriceLoading(false);
    }
  };

  const ratioNum = Number(targetRatio || 0);
  const totalWithThis = totalTargetRatio + ratioNum;
  const remaining = 100 - totalWithThis;

  let ratioMsg;
  if (targetRatio) {
    if (totalWithThis > 100)        ratioMsg = { text: "목표 비율 합계가 100%를 초과했어요", color: "#C7532C" };
    else if (totalWithThis === 100) ratioMsg = { text: "목표 비율 합계가 100%입니다", color: "#34D399" };
    else                            ratioMsg = { text: `설정된 목표: ${totalWithThis}% / 남은 비율: ${remaining}%`, color: "rgba(255,255,255,0.5)" };
  } else {
    ratioMsg = { text: `현재 설정: ${totalTargetRatio}% / 남은 비율: ${100 - totalTargetRatio}%`, color: "rgba(255,255,255,0.5)" };
  }

  // 모든 유형: 이름 + 금액 > 0 + 목표비율 필수 (현재가 실패 시 직접 입력 유도)
  const canSave = name.trim() && targetRatio && !priceLoading && Number(amount) > 0;

  const handleSave = () => {
    if (!canSave) return;
    onSave({
      type: type.key,
      name: name.trim(),
      ticker: ticker || null,
      currentPrice: currentPrice ? Number(currentPrice) : null,
      qty: qty ? Number(qty) : null,
      amount: Number(amount) || 0,
      buyPrice: buyPrice ? Number(buyPrice) : null,
      targetRatio: Number(targetRatio),
    });
  };

  const amountAuto = needsSearch && currentPrice && qty;
  const amountStyle = {
    ...numInputStyle,
    background: amountAuto ? "rgba(52,211,153,0.05)" : "rgba(255,255,255,0.05)",
    border: `1px solid ${amountAuto ? "rgba(52,211,153,0.25)" : "rgba(255,255,255,0.1)"}`,
    color: amountAuto ? "#34D399" : "#E8EFE9",
    fontWeight: 600,
  };

  const labelStyle = { fontSize: 10.5, color: "rgba(255,255,255,0.45)", marginBottom: 6, display: "block" };

  return (
    <div className="fade-up" style={{
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.09)",
      background: "rgba(255,255,255,0.02)",
      padding: "16px", marginBottom: 16,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: type.dot, display: "inline-block" }} />
        <div style={{ fontSize: 13, fontWeight: 600 }}>{type.label} 추가</div>
      </div>

      {/* 자산명 */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>자산명 {needsSearch && "(종목 검색)"}</label>
        {needsSearch ? (
          <StockSearchInput
            market={type.key}
            onSelect={handleSelect}
            value={name}
            onChangeName={(v) => { setName(v); if (!v) { setTicker(""); setCurrentPrice(""); } }}
          />
        ) : (
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder={type.key === "cash" ? "예: 보통예금, CMA" : "예: 비트코인, 금"}
            style={textInputStyle}
          />
        )}
      </div>

      {/* 현재가 + 수량 (주식) */}
      {needsSearch && (
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>현재가</label>
            <input type="number" value={priceLoading ? "" : currentPrice}
              onChange={(e) => setCurrentPrice(e.target.value)}
              placeholder={priceLoading ? "조회 중..." : "자동 입력"}
              style={{
                ...numInputStyle,
                color: currentPrice ? "#34D399" : "#E8EFE9",
              }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>수량</label>
            <input type="number" value={qty} onChange={(e) => setQty(e.target.value)}
              placeholder="보유 주식 수" style={numInputStyle} />
          </div>
        </div>
      )}

      {/* 평가금액 */}
      <div style={{ marginBottom: 12 }}>
        <label style={labelStyle}>
          {needsSearch ? "평가금액" : "금액"}
          {needsSearch && !amountAuto && (
            <span style={{ color: "#C7532C", marginLeft: 6, fontWeight: 600 }}>· 직접 입력 필수</span>
          )}
        </label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
          readOnly={!!amountAuto}
          placeholder={needsSearch && !amountAuto ? "금액 직접 입력 (원)" : needsSearch ? "현재가 × 수량" : "보유 금액"}
          style={{
            ...amountStyle,
            border: needsSearch && !amountAuto && !amount
              ? "1px solid rgba(199,83,44,0.5)"
              : amountStyle.border,
          }} />
      </div>

      {/* 평균 매입가 (주식) */}
      {needsSearch && (
        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>평균 매입가 (선택)</label>
          <input type="number" value={buyPrice} onChange={(e) => setBuyPrice(e.target.value)}
            placeholder="입력 시 수익률 자동 계산" style={numInputStyle} />
        </div>
      )}

      {/* 목표 비율 */}
      <div style={{ marginBottom: 10 }}>
        <label style={labelStyle}>목표 비율 (%)</label>
        <input type="number" value={targetRatio} onChange={(e) => setTargetRatio(e.target.value)}
          placeholder="예: 30" style={numInputStyle} />
        <div style={{ fontSize: 11, color: ratioMsg.color, marginTop: 8, lineHeight: 1.5 }}>
          {ratioMsg.text}
        </div>
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
          background: canSave ? "#34D399" : "rgba(255,255,255,0.06)",
          color: canSave ? "#0B1510" : "rgba(255,255,255,0.25)",
          fontFamily: "inherit", fontSize: 13, fontWeight: 700,
          cursor: canSave ? "pointer" : "not-allowed",
        }}>{priceLoading ? "조회 중..." : "저장"}</button>
      </div>

      <div style={{ marginTop: 12, fontSize: 10, color: "rgba(255,255,255,0.25)", textAlign: "center", lineHeight: 1.5 }}>
        정보 제공 목적 · 투자 결정은 본인 책임
      </div>
    </div>
  );
};

const AssetCard = ({ asset, currentRatio, onRemove }) => {
  const diff = currentRatio - asset.targetRatio;
  const diffColor = Math.abs(diff) < 1 ? "#34D399" : diff > 0 ? "#C7532C" : "#6B8CC7";

  let profitInfo = null;
  if (asset.buyPrice && asset.currentPrice && asset.qty) {
    const profit = (asset.currentPrice - asset.buyPrice) * asset.qty;
    const profitRate = ((asset.currentPrice - asset.buyPrice) / asset.buyPrice) * 100;
    profitInfo = { amount: profit, rate: profitRate, color: profit >= 0 ? "#34D399" : "#C7532C" };
  }

  const typeInfo = ASSET_TYPES.find(t => t.key === asset.type) || {};

  return (
    <div style={{
      padding: "14px 15px", borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.02)",
      marginBottom: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ width: 6, height: 6, borderRadius: 999, background: typeInfo.dot || "#8A9B8E", display: "inline-block", flexShrink: 0 }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: "#E8EFE9" }}>{asset.name}</div>
          </div>
          {asset.ticker && (
            <div className="num" style={{ fontSize: 10.5, color: "rgba(255,255,255,0.35)", paddingLeft: 14 }}>
              {asset.ticker}{asset.qty ? ` · ${asset.qty}주` : ""}
            </div>
          )}
        </div>
        <div className="tap" onClick={() => onRemove(asset.id)} style={{
          fontSize: 16, lineHeight: 1,
          width: 22, height: 22, borderRadius: 999,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(255,255,255,0.35)",
          background: "rgba(255,255,255,0.03)",
        }}>−</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>평가금액</span>
        <span className="num" style={{ fontSize: 14, fontWeight: 700, color: "#E8EFE9" }}>
          {asset.amount ? fmtMoney(asset.amount) : "—"}
        </span>
      </div>

      {profitInfo && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>수익</span>
          <div style={{ textAlign: "right" }}>
            <div className="num" style={{ fontSize: 12, fontWeight: 700, color: profitInfo.color }}>
              {profitInfo.amount >= 0 ? "+" : ""}{fmtMoney(profitInfo.amount)}
            </div>
            <div className="num" style={{ fontSize: 10.5, color: profitInfo.color, marginTop: 1 }}>
              {profitInfo.rate >= 0 ? "+" : ""}{profitInfo.rate.toFixed(1)}%
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11 }}>
        <span style={{ color: "rgba(255,255,255,0.4)" }}>현재 / 목표</span>
        <span>
          <span className="num" style={{ color: "#E8EFE9", fontWeight: 600 }}>{currentRatio.toFixed(1)}%</span>
          <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 4px" }}>/</span>
          <span className="num" style={{ color: "rgba(255,255,255,0.55)" }}>{asset.targetRatio}%</span>
          <span className="num" style={{ color: diffColor, marginLeft: 8, fontWeight: 600 }}>
            {diff >= 0 ? "+" : ""}{diff.toFixed(1)}%
          </span>
        </span>
      </div>
    </div>
  );
};

export default function Portfolio() {
  const router = useRouter();
  const [assets, setAssets] = useState([]);
  const [isSample, setIsSample] = useState(false);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [selectedType, setSelectedType] = useState(null);

  const total = assets.reduce((sum, a) => sum + a.amount, 0);
  const totalTargetRatio = assets.reduce((sum, a) => sum + (a.targetRatio || 0), 0);

  const handleAddClick = () => setShowTypePicker(true);
  const handleTypePick = (type) => { setShowTypePicker(false); setSelectedType(type); };
  const handleSave = (newAsset) => {
    setAssets((prev) => [...prev, { ...newAsset, id: Date.now() }]);
    setSelectedType(null);
  };
  const handleRemove = (id) => setAssets((prev) => prev.filter((a) => a.id !== id));
  const loadSample = () => { setAssets(SAMPLE_DATA); setIsSample(true); };
  const clearSample = () => { setAssets([]); setIsSample(false); };

  const isEmpty = assets.length === 0;

  return (
    <>
      <Head>
        <title>+α | 포트폴리오 진단</title>
      </Head>

      <div style={{
        fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif",
        background: "#0B1510", minHeight: "100vh",
        maxWidth: 480, margin: "0 auto", color: "#E8EFE9",
        paddingBottom: isEmpty ? 120 : 40,
      }}>
        <style jsx global>{`
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable.min.css');
          @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Cormorant+Garamond:ital,wght@1,500&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #0B1510; }
          ::-webkit-scrollbar { display: none; }
          @keyframes fadeUp  { from{opacity:0;transform:translateY(7px)} to{opacity:1;transform:translateY(0)} }
          @keyframes slideUp { from{transform:translateX(-50%) translateY(100%)} to{transform:translateX(-50%) translateY(0)} }
          .fade-up { animation: fadeUp .28s ease both; }
          .tap { cursor: pointer; transition: opacity .1s; }
          .tap:active { opacity: .6; }
          .num { font-family: "JetBrains Mono", ui-monospace, Menlo, monospace; font-variant-numeric: tabular-nums; letter-spacing: -0.01em; }
          input:focus { border-color: rgba(52,211,153,0.4) !important; outline: none; }
          input::placeholder { color: rgba(255,255,255,0.2); }
          input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        `}</style>

        {/* HEADER */}
        <div style={{ padding: "16px 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="tap" onClick={() => router.push("/")} style={{
            fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 10,
            display: "inline-flex", alignItems: "center", gap: 4,
          }}>← 시황</div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
              fontSize: 22, lineHeight: 1, color: "#34D399", fontWeight: 500,
            }}>+α</span>
            <span style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 9, color: "rgba(255,255,255,0.4)",
              letterSpacing: "0.18em", textTransform: "uppercase",
            }}>Portfolio</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em" }}>포트폴리오 진단</div>
        </div>

        {/* 샘플 뱃지 */}
        {isSample && (
          <div className="tap" onClick={clearSample} style={{
            margin: "12px 16px 0", padding: "9px 12px", borderRadius: 8,
            background: "rgba(199,83,44,0.08)", border: "1px solid rgba(199,83,44,0.22)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 11, color: "#C7532C" }}>샘플 데이터 보는 중</span>
            <span style={{ fontSize: 11, color: "#C7532C", fontWeight: 600 }}>내 자산 입력하기 →</span>
          </div>
        )}

        {/* BODY */}
        <div style={{ padding: "16px" }}>
          {/* 요약 */}
          {!isEmpty && (
            <div style={{
              marginBottom: 16, padding: "14px 16px", borderRadius: 12,
              background: "rgba(52,211,153,0.05)", border: "1px solid rgba(52,211,153,0.15)",
            }}>
              <div style={{ fontSize: 10, color: "#34D399", letterSpacing: 1, marginBottom: 6 }}>총 평가금액</div>
              <div className="num" style={{ fontSize: 22, fontWeight: 700, color: "#E8EFE9" }}>{fmtMoney(total)}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>
                {assets.length}개 자산 · 목표 비율 합계 <span className="num">{totalTargetRatio}%</span>
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
            />
          )}

          {/* 자산 리스트 */}
          {!isEmpty && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: 1 }}>내 자산</div>
                {!selectedType && (
                  <div className="tap" onClick={handleAddClick} style={{
                    fontSize: 12, color: "#34D399", fontWeight: 600,
                    padding: "4px 10px", borderRadius: 6,
                    background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.25)",
                  }}>+ 추가</div>
                )}
              </div>
              {assets.map((asset) => (
                <AssetCard
                  key={asset.id}
                  asset={asset}
                  currentRatio={total > 0 ? (asset.amount / total) * 100 : 0}
                  onRemove={handleRemove}
                />
              ))}
            </>
          )}

          {/* 빈 상태 */}
          {isEmpty && !selectedType && (
            <div className="fade-up" style={{ padding: "24px 8px", textAlign: "center" }}>
              <div style={{
                fontFamily: "'Cormorant Garamond', serif", fontStyle: "italic",
                fontSize: 64, lineHeight: 1, color: "#34D399", marginBottom: 20,
              }}>+α</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>보유 자산을 추가해보세요</div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.42)", lineHeight: 1.75, marginBottom: 24 }}>
                자산명, 현재 금액, 목표 비율을 입력하면<br />
                현재 배분과의 편차를 바로 확인할 수 있어요
              </div>
              <button onClick={handleAddClick} style={{
                width: "100%", padding: "14px 0", borderRadius: 12, border: "none", cursor: "pointer",
                fontFamily: "inherit", fontSize: 14, fontWeight: 700,
                background: "#34D399", color: "#0B1510", marginBottom: 10,
              }}>+ 자산 추가하기</button>
              <button onClick={loadSample} style={{
                width: "100%", padding: "12px 0", borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)", cursor: "pointer",
                fontFamily: "inherit", fontSize: 12.5, fontWeight: 500,
                background: "rgba(255,255,255,0.03)", color: "rgba(255,255,255,0.6)",
              }}>샘플 포트폴리오 먼저 보기</button>
            </div>
          )}
        </div>

        {/* 면책 고정 (빈 상태) */}
        {isEmpty && !selectedType && (
          <div style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 480, zIndex: 40,
            background: "rgba(11,21,16,0.97)", backdropFilter: "blur(12px)",
            borderTop: "1px solid rgba(255,255,255,0.07)",
            padding: "12px 16px 24px",
          }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", lineHeight: 1.6, textAlign: "center" }}>
              +α는 투자자문업자가 아니며, 본 도구는 정보 제공 목적의 자산 배분 시각화 서비스입니다.<br />
              투자 결정과 그에 따른 결과는 이용자 본인의 책임입니다.
            </div>
          </div>
        )}

        {/* 타입 선택 바텀시트 */}
        {showTypePicker && (
          <TypePickerSheet onClose={() => setShowTypePicker(false)} onPick={handleTypePick} />
        )}
      </div>
    </>
  );
}
