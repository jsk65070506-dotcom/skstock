// pages/api/test-daily-email.js
// 데일리 브리핑 이메일 템플릿 미리보기 발송 (샘플 데이터 사용)
// 호출: POST /api/test-daily-email  (Authorization: Bearer <CRON_SECRET>)

import { buildDailyBriefingHtml } from "../../lib/emails/dailyBriefing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://skstock.vercel.app";

const SAMPLE_DATA = {
  date: new Date().toISOString().slice(0, 10),
  us: "연준 금리 동결 발표 후 나스닥 1.2% 상승, 빅테크 중심 반등세",
  kr: "외국인 매수세 유입으로 코스피 2,650선 회복, 반도체 섹터 강세",
  crypto: "비트코인 9만 달러 돌파 시도, ETF 자금 유입 지속으로 상승 모멘텀",
  realestate: "서울 아파트 매매 거래 6주 연속 증가, 금리 인하 기대감 반영",
  keywords: ["NVDA", "삼성전자", "BTC"],
};

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: "RESEND_API_KEY 미설정" });

  const to = process.env.ADMIN_EMAIL || "jsk65070506@gmail.com";
  const { date, us, kr, crypto, realestate, keywords } = SAMPLE_DATA;
  const [, m, d] = date.split("-").map(Number);

  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=preview`;
  const html = buildDailyBriefingHtml({
    date,
    us,
    kr,
    crypto,
    realestate,
    keywords,
    unsubscribeUrl,
    isPreview: true,
  });

  const apiRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Plusalpha <onboarding@resend.dev>",
      to,
      subject: `[미리보기] [Plusalpha] ${m}월 ${d}일 오늘의 뉴스`,
      html,
    }),
  });

  if (!apiRes.ok) {
    const err = await apiRes.text().catch(() => "");
    return res.status(500).json({ error: `Resend 오류 ${apiRes.status}: ${err.slice(0, 200)}` });
  }

  const data = await apiRes.json();
  return res.status(200).json({ ok: true, to, resendId: data.id });
}
