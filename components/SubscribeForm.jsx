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
        setMessage("내일 아침 9시부터 Plusalpha가 도착합니다 ☕");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.message || "잠시 후 다시 시도해주세요");
      }
    } catch {
      setStatus("error");
      setMessage("잠시 후 다시 시도해주세요");
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
            매일 아침 9시, 당신의 메일함으로
          </div>
          <div style={{
            fontSize: 11.5, color: "#9FB3A6", marginBottom: 14, lineHeight: 1.5,
          }}>
            월급만으론 부족한 직장인을 위한 AI 시황 브리핑
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
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setStatus("idle"); }}
              placeholder="이메일 주소"
              disabled={status === "loading"}
              style={{
                flex: 1, padding: "10px 14px", borderRadius: 8,
                background: "#0F1C16", border: "1px solid rgba(232,239,234,0.1)",
                color: "#E8EFEA", fontSize: 13, outline: "none",
                fontFamily: "inherit",
              }}
            />
            <button
              type="submit"
              disabled={status === "loading"}
              style={{
                padding: "10px 16px", borderRadius: 8, border: "none",
                background: status === "loading" ? "rgba(52,211,153,0.4)" : "#34D399",
                color: "#0A1510", fontSize: 13, fontWeight: 700,
                cursor: status === "loading" ? "not-allowed" : "pointer",
                whiteSpace: "nowrap", fontFamily: "inherit", flexShrink: 0,
              }}
            >
              {status === "loading" ? "..." : "무료 구독"}
            </button>
          </div>

          {status === "error" && (
            <div style={{ fontSize: 11, color: "#E08968", marginTop: 6 }}>{message}</div>
          )}

          <div style={{
            fontSize: 10, color: "#6B8274", marginTop: 8, textAlign: "center",
          }}>
            언제든 해지 가능 · 광고성 메일 안 보냄
          </div>
        </form>
      )}
    </div>
  );
}
