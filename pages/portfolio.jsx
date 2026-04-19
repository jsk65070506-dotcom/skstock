// pages/portfolio.jsx — Plusalpha 포트폴리오 진단
import React, { useState, useEffect, useCallback } from "react";
import Head from "next/head";

// ── 편차 기준 ───────────────────────────────────────────────
const BALANCED_THRESHOLD = 5; // ±5% 이내 = 균형

function getDeviationStyle(dev) {
  const abs = Math.abs(dev);
  if (abs <= BALANCED_THRESHOLD)
    return { color: "#00e5a0", bg: "rgba(0,229,160,0.10)", label: "균형", symbol: "●" };
  if (dev > 0)
    return { color: "#f59e0b", bg: "rgba(245,158,11,0.10)", label: "목표보다 많음", symbol: "▲" };
  return { color: "#4d8aff", bg: "rgba(77,138,255,0.10)", label: "목표보다 적음", symbol: "▼" };
}

// ── 컴포넌트: Header ─────────────────────────────────────────
function Header() {
  return (
    <div style={{
      padding: "16px 20px 14px",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      display: "flex", alignItems: "center", gap: 10,
      position: "sticky", top: 0, background: "#07080c", zIndex: 50,
    }}>
      <div style={{ fontSize: 20, fontWeight: 800, fontStyle: "italic", color: "#00e5a0", lineHeight: 1 }}>+α</div>
      <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.15)" }} />
      <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>포트폴리오 진단</div>
    </div>
  );
}

// ── 컴포넌트: SummaryCard ────────────────────────────────────
function SummaryCard({ totalValue, totalTarget }) {
  if (totalValue === 0) return null;
  const targetOk = Math.abs(totalTarget - 100) < 0.1;
  return (
    <div style={{
      margin: "16px 20px 0",
      padding: "14px 16px",
      borderRadius: 12,
      background: "rgba(255,255,255,0.03)",
      border: "1px solid rgba(255,255,255,0.08)",
    }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 8 }}>총 자산 평가액</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "#dde1ea", letterSpacing: -0.5, marginBottom: 8 }}>
        ₩ {totalValue.toLocaleString("ko-KR")}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>목표 배분 합계:</span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          color: targetOk ? "#00e5a0" : "#f59e0b",
        }}>
          {totalTarget.toFixed(1)}% {targetOk ? "✓" : "⚠ 100%가 아님"}
        </span>
      </div>
    </div>
  );
}

// ── 컴포넌트: AssetInputForm ─────────────────────────────────
function AssetInputForm({ onAdd }) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("");
  const [target, setTarget] = useState("");
  const [error, setError] = useState("");

  const handleAdd = () => {
    if (!name.trim()) { setError("자산명을 입력해주세요"); return; }
    const v = Number(value.replace(/,/g, ""));
    const t = Number(target);
    if (isNaN(v) || v <= 0) { setError("현재 금액을 올바르게 입력해주세요"); return; }
    if (isNaN(t) || t < 0 || t > 100) { setError("목표 비율은 0~100 사이로 입력해주세요"); return; }
    onAdd({ name: name.trim(), value: v, target: t });
    setName(""); setValue(""); setTarget(""); setError("");
  };

  return (
    <div style={{ margin: "16px 20px 0", padding: "16px", borderRadius: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: 1, marginBottom: 12 }}>자산 추가</div>
      <input
        value={name}
        onChange={(e) => { setName(e.target.value); setError(""); }}
        onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        placeholder="자산명 (예: 삼성전자, 비트코인)"
        style={inputStyle}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input
          value={value}
          onChange={(e) => { setValue(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="현재 금액 (원)"
          type="number"
          style={{ ...inputStyle, flex: 2 }}
        />
        <input
          value={target}
          onChange={(e) => { setTarget(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="목표 %"
          type="number"
          min="0" max="100"
          style={{ ...inputStyle, flex: 1 }}
        />
      </div>
      {error && <div style={{ fontSize: 11, color: "#f59e0b", marginTop: 6 }}>{error}</div>}
      <button
        onClick={handleAdd}
        style={{
          marginTop: 10, width: "100%",
          padding: "11px 0", borderRadius: 10, border: "none",
          background: "#00e5a0", color: "#07080c",
          fontSize: 13, fontWeight: 700, cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        + 추가
      </button>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 9,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#dde1ea",
  fontSize: 13,
  fontFamily: "'IBM Plex Mono', monospace",
  outline: "none",
};

// ── 컴포넌트: Bar ────────────────────────────────────────────
function Bar({ pct, color, label }) {
  const capped = Math.min(pct, 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", width: 28, flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{
          width: `${capped}%`, height: "100%", borderRadius: 3,
          background: color, transition: "width 0.4s ease",
        }} />
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color, width: 44, textAlign: "right", flexShrink: 0 }}>
        {pct.toFixed(1)}%
      </div>
    </div>
  );
}

// ── 컴포넌트: AssetCard ──────────────────────────────────────
function AssetCard({ asset, totalValue, onUpdate, onRemove }) {
  const currentPct = totalValue > 0 ? (asset.value / totalValue) * 100 : 0;
  const deviation = currentPct - asset.target;
  const ds = getDeviationStyle(deviation);

  const handleValueChange = (raw) => {
    const v = Number(raw.replace(/,/g, ""));
    if (!isNaN(v) && v >= 0) onUpdate(asset.id, { value: v });
  };

  const handleTargetChange = (raw) => {
    const t = Number(raw);
    if (!isNaN(t) && t >= 0 && t <= 100) onUpdate(asset.id, { target: t });
  };

  return (
    <div style={{
      margin: "12px 20px 0",
      padding: "14px 16px",
      borderRadius: 12,
      border: "1px solid rgba(255,255,255,0.07)",
      background: "rgba(255,255,255,0.02)",
      animation: "fadeUp 0.2s ease both",
    }}>
      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#dde1ea" }}>{asset.name}</div>
        <button onClick={() => onRemove(asset.id)} style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 14, color: "rgba(255,255,255,0.25)", padding: "2px 4px",
          lineHeight: 1,
        }}>×</button>
      </div>

      {/* 인라인 편집 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 2 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 4, letterSpacing: 0.5 }}>현재 금액 (원)</div>
          <input
            type="number"
            defaultValue={asset.value}
            onBlur={(e) => handleValueChange(e.target.value)}
            style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", marginBottom: 4, letterSpacing: 0.5 }}>목표 %</div>
          <input
            type="number"
            defaultValue={asset.target}
            min="0" max="100"
            onBlur={(e) => handleTargetChange(e.target.value)}
            style={{ ...inputStyle, fontSize: 12, padding: "8px 10px" }}
          />
        </div>
      </div>

      {/* 바 차트 */}
      <Bar pct={currentPct} color="#dde1ea" label="현재" />
      <Bar pct={asset.target} color="rgba(255,255,255,0.25)" label="목표" />

      {/* 편차 뱃지 */}
      <div style={{
        marginTop: 10,
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "5px 10px", borderRadius: 20,
        background: ds.bg,
        fontSize: 11, fontWeight: 600, color: ds.color,
      }}>
        <span>{ds.symbol}</span>
        <span>편차 · {ds.label} {deviation > 0 ? "+" : ""}{deviation.toFixed(1)}%</span>
      </div>
    </div>
  );
}

// ── 컴포넌트: ClearAllButton ─────────────────────────────────
function ClearAllButton({ onClear }) {
  return (
    <div style={{ padding: "20px", textAlign: "center" }}>
      <button onClick={onClear} style={{
        background: "none", border: "1px solid rgba(255,77,109,0.3)",
        borderRadius: 10, padding: "10px 24px",
        color: "rgba(255,77,109,0.6)", fontSize: 12, cursor: "pointer",
        fontFamily: "inherit", fontWeight: 600,
      }}>
        모두 지우기
      </button>
    </div>
  );
}

// ── 컴포넌트: Disclaimer ─────────────────────────────────────
function Disclaimer() {
  return (
    <div style={{
      margin: "0 20px 32px",
      padding: "12px 14px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.05)",
    }}>
      <div style={{ fontSize: 9.5, color: "rgba(255,255,255,0.22)", lineHeight: 1.8 }}>
        ℹ️ Plusalpha는 투자자문업자가 아니며, 본 도구는 정보 제공 목적의 자산 배분 시각화 서비스입니다. 투자 결정과 그에 따른 결과는 이용자 본인의 책임입니다.
      </div>
    </div>
  );
}

// ── 빈 화면 ──────────────────────────────────────────────────
function EmptyState() {
  return (
    <div style={{ textAlign: "center", padding: "60px 24px" }}>
      <div style={{ fontSize: 36, marginBottom: 14 }}>📊</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.45)", marginBottom: 8 }}>
        보유 자산을 추가해보세요
      </div>
      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.25)", lineHeight: 1.7 }}>
        자산명, 현재 금액, 목표 비율을 입력하면<br />
        현재 배분과의 편차를 바로 확인할 수 있어요
      </div>
    </div>
  );
}

// ── 최상위: PlusalphaApp ─────────────────────────────────────
let idCounter = 1;

export default function PortfolioPage() {
  const [assets, setAssets] = useState([]);
  const [mounted, setMounted] = useState(false);

  // localStorage 로드 (hydration 안전)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("plusalpha-portfolio");
      if (saved) {
        const parsed = JSON.parse(saved);
        setAssets(parsed);
        idCounter = parsed.reduce((max, a) => Math.max(max, a.id ?? 0), 0) + 1;
      }
    } catch {}
    setMounted(true);
  }, []);

  // localStorage 저장
  useEffect(() => {
    if (!mounted) return;
    try { localStorage.setItem("plusalpha-portfolio", JSON.stringify(assets)); } catch {}
  }, [assets, mounted]);

  const addAsset = useCallback((asset) => {
    setAssets((prev) => [...prev, { ...asset, id: idCounter++ }]);
  }, []);

  const updateAsset = useCallback((id, patch) => {
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, ...patch } : a));
  }, []);

  const removeAsset = useCallback((id) => {
    setAssets((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAll = () => {
    if (window.confirm("모든 자산을 지울까요?")) setAssets([]);
  };

  const totalValue = assets.reduce((s, a) => s + a.value, 0);
  const totalTarget = assets.reduce((s, a) => s + a.target, 0);

  return (
    <>
      <Head>
        <title>포트폴리오 진단 | +α Plusalpha</title>
        <meta name="description" content="내 자산 배분이 목표와 얼마나 다른지 한눈에 확인하세요." />
      </Head>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        background: "#07080c", minHeight: "100vh",
        maxWidth: 480, margin: "0 auto", color: "#dde1ea",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700;800&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: #07080c; }
          ::-webkit-scrollbar { display: none; }
          @keyframes fadeUp { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
          input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
          input::placeholder { color: rgba(255,255,255,0.2); }
          input:focus { border-color: rgba(0,229,160,0.4) !important; outline: none; }
        `}</style>

        <Header />
        <SummaryCard totalValue={totalValue} totalTarget={totalTarget} />
        <AssetInputForm onAdd={addAsset} />

        {assets.length === 0 ? (
          <EmptyState />
        ) : (
          assets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              totalValue={totalValue}
              onUpdate={updateAsset}
              onRemove={removeAsset}
            />
          ))
        )}

        {assets.length > 0 && <ClearAllButton onClear={clearAll} />}
        <Disclaimer />
      </div>
    </>
  );
}
