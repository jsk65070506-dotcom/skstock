import { ImageResponse } from "next/og";

export const config = { runtime: "edge" };

export default function handler() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#07080c",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "72px 88px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 배경 글로우 */}
        <div style={{ position: "absolute", right: "-80px", top: "-80px", width: "520px", height: "520px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,229,160,0.07) 0%, transparent 70%)", display: "flex" }} />
        <div style={{ position: "absolute", right: "120px", bottom: "80px", width: "280px", height: "280px", borderRadius: "50%", background: "radial-gradient(circle, rgba(0,229,160,0.04) 0%, transparent 70%)", display: "flex" }} />

        {/* BETA 뱃지 */}
        <span style={{ fontSize: "13px", fontWeight: 700, letterSpacing: "1px", padding: "4px 12px", borderRadius: "6px", background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.45)", border: "1px solid rgba(255,255,255,0.15)", display: "flex", marginBottom: "32px" }}>
          BETA
        </span>

        {/* 타이틀: 꾸기 + Daily Morning 컬러 분리 */}
        <div style={{ display: "flex", alignItems: "baseline", gap: "18px", marginBottom: "22px", lineHeight: 1.1 }}>
          <span style={{ fontSize: "72px", fontWeight: 800, color: "#00e5a0", letterSpacing: "1px", display: "flex" }}>
            꾸기
          </span>
          <span style={{ fontSize: "68px", fontWeight: 500, color: "rgba(255,255,255,0.72)", letterSpacing: "-1px", display: "flex" }}>
            Daily Morning
          </span>
        </div>

        {/* 서브타이틀 */}
        <div style={{ fontSize: "24px", color: "rgba(255,255,255,0.38)", letterSpacing: "-0.3px", lineHeight: 1.5, marginBottom: "52px", display: "flex" }}>
          AI가 분석하는 매일 아침 주식·부동산·코인 브리핑
        </div>

        {/* 카테고리 태그 */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          {["주식", "부동산", "가상자산", "조각투자"].map((item) => (
            <div key={item} style={{ fontSize: "16px", color: "rgba(255,255,255,0.28)", padding: "5px 14px", borderRadius: "20px", border: "1px solid rgba(255,255,255,0.1)", display: "flex" }}>
              {item}
            </div>
          ))}
        </div>

        {/* URL */}
        <div style={{ position: "absolute", right: "88px", bottom: "52px", fontSize: "16px", color: "rgba(0,229,160,0.45)", letterSpacing: "0.5px", display: "flex" }}>
          skstock.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
