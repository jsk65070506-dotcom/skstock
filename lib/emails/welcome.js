// lib/emails/welcome.js
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://skstock.vercel.app";

export async function sendWelcomeEmail({ email, unsubscribeToken }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY 미설정");

  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${unsubscribeToken}`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A1510;font-family:'Pretendard Variable',Pretendard,system-ui,sans-serif;color:#E8EFEA">
  <div style="max-width:480px;margin:0 auto;padding:32px 20px">

    <!-- 로고 -->
    <div style="margin-bottom:32px">
      <span style="font-size:13px;font-weight:500;color:#34D399;vertical-align:baseline">+</span><span style="font-family:'Georgia',serif;font-style:italic;font-size:26px;color:#34D399;line-height:1">α</span>
      <span style="font-size:13px;font-weight:600;color:#9FB3A6;margin-left:6px;letter-spacing:-0.01em">Plusalpha</span>
    </div>

    <!-- 메인 카드 -->
    <div style="background:#101F18;border:1px solid rgba(232,239,234,0.08);border-radius:12px;padding:28px 24px;margin-bottom:20px">
      <div style="font-size:22px;font-weight:700;letter-spacing:-0.02em;margin-bottom:10px;color:#E8EFEA">구독해주셔서 감사해요!</div>
      <div style="font-size:14px;color:#9FB3A6;line-height:1.7;margin-bottom:24px">
        내일 아침 9시부터 AI 시황 브리핑이 도착해요.<br>
        월급만으론 부족한 우리를 위한 정보, 매일 챙겨드릴게요.
      </div>

      <!-- 콘텐츠 목록 -->
      <div style="border-top:1px solid rgba(232,239,234,0.08);padding-top:20px;margin-bottom:24px">
        <div style="font-size:11px;letter-spacing:0.1em;color:#6B8274;margin-bottom:14px;text-transform:uppercase">매일 받을 내용</div>
        ${[
          ["🇺🇸", "미국 주식", "S&P500·나스닥·주요 이슈"],
          ["🇰🇷", "한국 주식", "코스피·코스닥·시황"],
          ["💎", "가상자산", "비트코인·이더리움·알트"],
          ["🏢", "부동산", "시장 동향·금리·이슈"],
        ].map(([emoji, title, desc]) => `
        <div style="display:flex;align-items:flex-start;gap:12px;margin-bottom:12px">
          <span style="font-size:16px;flex-shrink:0;margin-top:1px">${emoji}</span>
          <div>
            <div style="font-size:13px;font-weight:600;color:#E8EFEA">${title}</div>
            <div style="font-size:11px;color:#6B8274;margin-top:2px">${desc}</div>
          </div>
        </div>`).join("")}
      </div>

      <!-- CTA 버튼 -->
      <a href="${SITE_URL}" style="display:block;text-align:center;background:#34D399;color:#0A1510;font-size:14px;font-weight:700;padding:14px 0;border-radius:8px;text-decoration:none;letter-spacing:-0.01em">
        지금 시황 보기
      </a>
    </div>

    <!-- 면책 고지 -->
    <div style="background:#101F18;border:1px solid rgba(232,239,234,0.06);border-radius:8px;padding:12px 14px;margin-bottom:20px">
      <p style="margin:0;font-size:10px;color:#6B8274;line-height:1.7">
        본 메일은 투자 권유가 아닌 정보 제공 목적입니다. 제공된 시황 정보는 AI가 뉴스 헤드라인을 기반으로 생성한 참고 자료이며, 투자 판단의 책임은 본인에게 있습니다.
      </p>
    </div>

    <!-- 푸터 -->
    <div style="text-align:center;font-size:11px;color:#6B8274;line-height:1.8">
      <a href="${unsubscribeUrl}" style="color:#6B8274;text-decoration:underline">구독 해지</a>
      &nbsp;·&nbsp;
      <a href="mailto:jsk65070506@gmail.com" style="color:#6B8274;text-decoration:underline">피드백 보내기</a>
      <br>
      Plusalpha · AI 기반 시황 브리핑 서비스
    </div>
  </div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Plusalpha <onboarding@resend.dev>",
      to: email,
      subject: "Plusalpha 구독이 완료되었어요 ☕",
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`웰컴 이메일 발송 실패 (${res.status}): ${errText.slice(0, 200)}`);
  }

  return await res.json();
}
