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
        {/* 배경 장식 — 우측 원형 글로우 */}
        <div
          style={{
            position: "absolute",
            right: "-80px",
            top: "-80px",
            width: "520px",
            height: "520px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,229,160,0.07) 0%, transparent 70%)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            right: "120px",
            bottom: "80px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,229,160,0.04) 0%, transparent 70%)",
            display: "flex",
          }}
        />

        {/* BETA 뱃지 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "1px",
              padding: "4px 12px",
              borderRadius: "6px",
              background: "rgba(255,255,255,0.08)",
              color: "rgba(255,255,255,0.45)",
              border: "1px solid rgba(255,255,255,0.15)",
              display: "flex",
            }}
          >
            BETA
          </span>
        </div>

        {/* 타이틀 */}
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "#00e5a0",
            letterSpacing: "4px",
            lineHeight: 1.1,
            marginBottom: "20px",
            display: "flex",
          }}
        >
          꾸기 MARKET DAILY
        </div>

        {/* 서브타이틀 */}
        <div
          style={{
            fontSize: "26px",
            color: "rgba(255,255,255,0.45)",
            letterSpacing: "-0.3px",
            lineHeight: 1.5,
            marginBottom: "52px",
            display: "flex",
          }}
        >
          AI가 분석하는 매일 아침 시황 브리핑
        </div>

        {/* 하단 구분선 + 설명 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
          }}
        >
          {["🇺🇸 미국 시장", "🇰🇷 한국 시장", "📰 주요 이슈", "📊 섹터 분석"].map((item) => (
            <div
              key={item}
              style={{
                fontSize: "18px",
                color: "rgba(255,255,255,0.3)",
                display: "flex",
              }}
            >
              {item}
            </div>
          ))}
        </div>

        {/* 우측 하단 URL */}
        <div
          style={{
            position: "absolute",
            right: "88px",
            bottom: "52px",
            fontSize: "16px",
            color: "rgba(0,229,160,0.5)",
            letterSpacing: "1px",
            display: "flex",
          }}
        >
          skstock.vercel.app
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
