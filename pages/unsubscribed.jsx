// pages/unsubscribed.jsx
import Head from "next/head";
import { useRouter } from "next/router";

export default function Unsubscribed() {
  const { query } = useRouter();
  const isError = query.error === "1";

  return (
    <>
      <Head><title>구독 해지 | Plusalpha</title></Head>
      <div style={{
        minHeight: "100vh", background: "#0A1510",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Pretendard Variable', Pretendard, system-ui, sans-serif",
        padding: "24px",
      }}>
        <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
          {/* 로고 */}
          <div style={{ marginBottom: 32 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#34D399" }}>+</span>
            <span style={{ fontFamily: "'Georgia', serif", fontStyle: "italic", fontSize: 26, color: "#34D399", lineHeight: 1 }}>α</span>
          </div>

          {isError ? (
            <>
              <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#E8EFEA", marginBottom: 10, letterSpacing: -0.5 }}>
                처리 중 오류가 발생했어요
              </div>
              <div style={{ fontSize: 14, color: "#9FB3A6", lineHeight: 1.7, marginBottom: 32 }}>
                링크가 만료됐거나 이미 해지된 구독이에요.
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 36, marginBottom: 16 }}>👋</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#E8EFEA", marginBottom: 10, letterSpacing: -0.5 }}>
                구독이 해지되었습니다
              </div>
              <div style={{ fontSize: 14, color: "#9FB3A6", lineHeight: 1.7, marginBottom: 32 }}>
                그동안 Plusalpha를 이용해주셔서 감사해요.<br />
                언제든 다시 구독하실 수 있어요.
              </div>
            </>
          )}

          <a href="/" style={{
            display: "block", padding: "14px 0", borderRadius: 8,
            background: "#34D399", color: "#0A1510",
            fontSize: 14, fontWeight: 700, textDecoration: "none",
            letterSpacing: -0.3,
          }}>
            홈으로 돌아가기
          </a>
        </div>
      </div>
    </>
  );
}
