// components/SubscribeForm.jsx
import { useState } from "react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SubscribeForm({ variant = "default" }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | duplicate | error
  const [message, setMessage] = useState("");

  const isCompact = variant === "compact";

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!EMAIL_REGEX.test(email)) {
      setStatus("error");
      setMessage("올바른 이메일 주소를 입력해주세요");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (data.isAlreadySubscribed) {
        setStatus("duplicate");
        setMessage("이미 구독 중이에요. 감사합니다 :)");
      } else if (data.success) {
        setStatus("success");
        // F-08: 성공 마이크로카피
        setMessage("확인 메일을 보냈어요. 받은편지함(과 스팸함)을 확인해주세요. 메일 안의 링크를 누르면 구독이 시작됩니다.");
        setEmail("");
      } else {
        setStatus("error");
        // F-08: 실패 마이크로카피
        setMessage(data.message || "잠시 후 다시 시도해주세요. 문제가 계속되면 jsk65070506@gmail.com으로 알려주세요.");
      }
    } catch {
      setStatus("error");
      setMessage("잠시 후 다시 시도해주세요. 문제가 계속되면 jsk65070506@gmail.com으로 알려주세요.");
    }
  };

  const isDone = status === "success" || status === "duplicate";

  return (
    <div style={{
      margin: isCompact ? "0" : "0 0 16px",
      padding: isCompact ? "16px" : "18px 16px",
      borderRadius: 12,
      background: "rgba(52,211,153,0.04)",
      border: "1px solid rgba(52,211,153,0.14)",
    }}>
      {!isCompact && (
        <>
          <div style={{
            fontSize: 14, fontWeight: 700, color: "#E8EFEA",
            letterSpacing: -0.3, marginBottom: 4,
          }}>
            매일 아침 9시, 시장을 먼저 파악하세요
          </div>
          <div style={{
            fontSize: 11.5, color: "#9FB3A6", marginBottom: 14, lineHeight: 1.5,
          }}>
            주식·가상자산·부동산 뉴스를 빠르게 전달해드려요.
          </div>
        </>
      )}

      {isDone ? (
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: status === "success" ? "#34D399" : "#9FB3A6",
          textAlign: "center", padding: "8px 0",
        }}>
          {message}
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ display: "flex", gap: 8 }}>
            {/* F-11: aria-label, 포커스 링 */}
            <input
              type="email"
              id="subscribe-email"
              aria-label="구독 신청 이메일 주소"
              aria-required="true"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
              placeholder="이메일 주소를 입력하세요"
              disabled={status === "loading"}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 8,
                background: "#0F1C16", border: "1px solid rgba(232,239,234,0.1)",
                color: "#E8EFEA", fontSize: 13, outline: "none",
                fontFamily: "inherit",
              }}
              onFocus={(e) => (e.target.style.boxShadow = "0 0 0 2px #34D399")}
              onBlur={(e)  => (e.target.style.boxShadow = "none")}
            />
            {/* F-08: 로딩 시 disabled + 스피너 */}
            <button
              type="submit"
              disabled={status === "loading"}
              aria-busy={status === "loading"}
              style={{
                padding: "10px 16px", borderRadius: 8, border: "none",
                background: status === "loading" ? "rgba(52,211,153,0.4)" : "#34D399",
                color: "#0A1510", fontSize: 13, fontWeight: 700,
                cursor: status === "loading" ? "not-allowed" : "pointer",
                whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              {status === "loading" && (
                <span style={{
                  display: "inline-block", width: 12, height: 12,
                  border: "2px solid rgba(10,21,16,0.3)",
                  borderTopColor: "#0A1510",
                  borderRadius: "50%",
                  animation: "spin 0.7s linear infinite",
                }} />
              )}
              {status === "loading" ? "처리 중" : "무료로 받아보기"}
            </button>
          </div>

          {status === "error" && (
            <div style={{ fontSize: 11, color: "#E08968", marginTop: 6 }}>{message}</div>
          )}

          {/* F-06: 해지 방법 구체화 */}
          <div style={{
            fontSize: 10, color: "#6B8274", marginTop: 8, textAlign: "center",
          }}>
            매 메일 하단의 &apos;구독 해지&apos; 링크 1번 클릭이면 즉시 해지됩니다.
          </div>
        </form>
      )}
    </div>
  );
}
