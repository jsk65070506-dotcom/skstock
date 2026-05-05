// lib/emails/welcomeEmail.js
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://skstock.vercel.app";

/**
 * 구독 완료 웰컴 이메일 발송
 * - 4줄 요약 예시 포함
 * - onboarding@resend.dev 테스트 발신자 사용 (도메인 미검증)
 */
export async function sendWelcomeEmail({ email, unsubscribeToken }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY 미설정");

  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${unsubscribeToken}`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Plusalpha 구독 완료</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;-webkit-font-smoothing:antialiased">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">

    <!-- 카드 -->
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

      <!-- 헤더 -->
      <div style="background:#0d1f16;padding:24px 28px 20px">
        <div style="margin-bottom:10px">
          <span style="font-size:14px;font-weight:500;color:#34d399">+</span><span style="font-family:Georgia,serif;font-style:italic;font-size:28px;color:#34d399;line-height:1">α</span>
          <span style="font-size:13px;font-weight:600;color:#6b8274;margin-left:8px">Plusalpha</span>
        </div>
        <div style="font-size:21px;font-weight:700;color:#e8efea;letter-spacing:-0.02em;line-height:1.3">
          구독해주셔서 감사해요! ☕
        </div>
        <div style="font-size:13px;color:#6b8274;margin-top:6px;line-height:1.6">
          내일 아침 9시부터 AI 시황 브리핑이 도착해요.<br>
          월급만으론 부족한 우리를 위한 정보, 매일 챙겨드릴게요.
        </div>
      </div>

      <!-- 예시 브리핑 -->
      <div style="padding:20px 28px 4px">
        <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:12px">이런 내용을 받아보게 돼요</div>
        <table style="width:100%;border-collapse:collapse">
          <tbody>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:top">
                <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:0.08em;margin-bottom:3px">🇺🇸 미국 주식</div>
                <div style="font-size:14px;color:#1a1a1a;line-height:1.55">연준 금리 동결 발표 후 나스닥 1.2% 상승, 빅테크 중심 반등세</div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:top">
                <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:0.08em;margin-bottom:3px">🇰🇷 한국 주식</div>
                <div style="font-size:14px;color:#1a1a1a;line-height:1.55">외국인 매수세 유입으로 코스피 2,650선 회복, 반도체 섹터 강세</div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;vertical-align:top">
                <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:0.08em;margin-bottom:3px">💎 가상자산</div>
                <div style="font-size:14px;color:#1a1a1a;line-height:1.55">비트코인 9만 달러 돌파 시도, ETF 자금 유입 지속으로 상승 모멘텀</div>
              </td>
            </tr>
            <tr>
              <td style="padding:12px 0;vertical-align:top">
                <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:0.08em;margin-bottom:3px">🏢 부동산</div>
                <div style="font-size:14px;color:#1a1a1a;line-height:1.55">서울 아파트 매매 거래 6주 연속 증가, 금리 인하 기대감 반영</div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- 오늘의 키워드 예시 -->
      <div style="padding:14px 28px 20px">
        <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px">오늘의 키워드 (예시)</div>
        <div>
          <span style="display:inline-block;background:#f0fdf8;color:#059669;border:1px solid #a7f3d0;border-radius:20px;font-size:12px;font-weight:600;padding:4px 12px;margin:3px 4px 3px 0">NVDA</span>
          <span style="display:inline-block;background:#f0fdf8;color:#059669;border:1px solid #a7f3d0;border-radius:20px;font-size:12px;font-weight:600;padding:4px 12px;margin:3px 4px 3px 0">삼성전자</span>
          <span style="display:inline-block;background:#f0fdf8;color:#059669;border:1px solid #a7f3d0;border-radius:20px;font-size:12px;font-weight:600;padding:4px 12px;margin:3px 4px 3px 0">BTC</span>
        </div>
      </div>

      <!-- CTA -->
      <div style="padding:0 28px 28px">
        <a href="${SITE_URL}" style="display:block;text-align:center;background:#059669;color:#ffffff;font-size:15px;font-weight:700;padding:15px 0;border-radius:8px;text-decoration:none;letter-spacing:-0.01em">
          지금 시황 보기 →
        </a>
      </div>

    </div>

    <!-- 면책 고지 -->
    <div style="margin-top:16px;padding:12px 16px;background:#fafafa;border-radius:8px;border:1px solid #ebebeb">
      <p style="margin:0;font-size:10px;color:#999;line-height:1.7">
        본 메일은 투자 권유가 아닌 정보 제공 목적입니다. 제공된 시황 정보는 AI가 뉴스 헤드라인을 기반으로 생성한 참고 자료이며, 투자 판단의 책임은 본인에게 있습니다.
      </p>
    </div>

    <!-- 푸터 -->
    <div style="text-align:center;font-size:11px;color:#aaa;line-height:1.9;margin-top:16px">
      <a href="${unsubscribeUrl}" style="color:#aaa;text-decoration:underline">구독 해지</a>
      &nbsp;·&nbsp;
      <a href="mailto:jsk65070506@gmail.com" style="color:#aaa;text-decoration:underline">피드백 보내기</a>
      <br>Plusalpha · AI 기반 시황 브리핑 서비스
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
