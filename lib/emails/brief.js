// lib/emails/brief.js
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://skstock.vercel.app";

const MARKET_LABELS = {
  us:     "미국 주식",
  kr:     "한국 주식",
  crypto: "가상자산",
  realty: "부동산",
  frac:   "실물자산",
};

function formatDate(dateStr) {
  const [, m, d] = dateStr.split("-");
  return `${parseInt(m)}월 ${parseInt(d)}일`;
}

// signal 값 → 표시 텍스트 + 색상
function signalDisplay(signal) {
  if (signal === "긍정") return { text: "긍정", color: "#34D399" };
  if (signal === "부정") return { text: "부정", color: "#E08968" };
  return { text: "중립", color: "#9FB3A6" };
}

function buildBriefHtml({ date, market, data, unsubscribeUrl }) {
  const label = MARKET_LABELS[market] || market;
  const isUp = data.sentiment === "bullish";
  const sentimentColor = isUp ? "#34D399" : "#E08968";
  const sentimentText = isUp ? "+ 강세" : "− 약세";

  const issueRows = (data.issues || []).slice(0, 3).map((item) => `
    <div style="padding:12px 0;border-bottom:1px solid rgba(232,239,234,0.06)">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px">
        <span style="font-size:10px;padding:2px 7px;border-radius:4px;font-weight:600;background:${item.sentiment==="bullish"?"rgba(52,211,153,0.12)":"rgba(224,137,104,0.12)"};color:${item.sentiment==="bullish"?"#34D399":"#E08968"};border:1px solid ${item.sentiment==="bullish"?"rgba(52,211,153,0.28)":"rgba(224,137,104,0.28)"}">
          ${item.sentiment === "bullish" ? "+ 강세" : "− 약세"}
        </span>
        <span style="font-size:10px;color:#6B8274">#${item.sector || ""}</span>
      </div>
      <div style="font-size:13px;font-weight:600;color:#E8EFEA;line-height:1.45">${item.title}</div>
    </div>`).join("");

  // picks: signal 기반 표시 (BUY/SELL/WATCH 없음)
  const pickRows = (data.picks || []).slice(0, 3).map((pick) => {
    const sig = signalDisplay(pick.signal);
    return `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid rgba(232,239,234,0.06)">
      <div>
        <span style="font-size:13px;font-weight:700;color:#E8EFEA;font-family:'JetBrains Mono',monospace">${pick.ticker}</span>
        <span style="font-size:11px;color:#6B8274;margin-left:6px">${pick.name || ""}</span>
        ${pick.reason ? `<div style="font-size:11px;color:#6B8274;margin-top:2px">${pick.reason}</div>` : ""}
      </div>
      <span style="font-size:11px;font-weight:700;padding:3px 9px;border-radius:5px;background:rgba(52,211,153,0.1);color:${sig.color};border:1px solid ${sig.color}44;flex-shrink:0;margin-left:8px">${sig.text}</span>
    </div>`;
  }).join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0A1510;font-family:'Pretendard Variable',Pretendard,system-ui,sans-serif;color:#E8EFEA">
  <div style="max-width:480px;margin:0 auto;padding:28px 20px">

    <!-- 로고 -->
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">
      <div>
        <span style="font-size:13px;font-weight:500;color:#34D399">+</span><span style="font-family:'Georgia',serif;font-style:italic;font-size:24px;color:#34D399;line-height:1">α</span>
        <span style="font-size:12px;font-weight:600;color:#9FB3A6;margin-left:6px">${formatDate(date)} ${label}</span>
      </div>
      <span style="font-size:10px;padding:2px 8px;border-radius:4px;background:${isUp?"rgba(52,211,153,0.12)":"rgba(224,137,104,0.12)"};color:${sentimentColor};border:1px solid ${isUp?"rgba(52,211,153,0.28)":"rgba(224,137,104,0.28)"};font-weight:600">
        ${sentimentText}
      </span>
    </div>

    <!-- 한 줄 요약 -->
    <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;line-height:1.4;margin-bottom:16px;color:#E8EFEA">
      ${data.oneLineSummary || ""}
    </div>

    <!-- AI 요약 -->
    <div style="font-size:13px;color:#9FB3A6;line-height:1.7;margin-bottom:24px;padding:14px;background:#101F18;border-radius:8px;border:1px solid rgba(52,211,153,0.12)">
      ${data.summary || ""}
    </div>

    ${issueRows ? `
    <!-- 주요 이슈 -->
    <div style="margin-bottom:20px">
      <div style="font-size:11px;letter-spacing:0.1em;color:#6B8274;margin-bottom:2px;text-transform:uppercase">주요 이슈</div>
      ${issueRows}
    </div>` : ""}

    ${pickRows ? `
    <!-- 오늘의 주목 포인트 -->
    <div style="margin-bottom:24px">
      <div style="font-size:11px;letter-spacing:0.1em;color:#6B8274;margin-bottom:2px;text-transform:uppercase">오늘의 주목 포인트</div>
      ${pickRows}
    </div>` : ""}

    <!-- CTA -->
    <a href="${SITE_URL}" style="display:block;text-align:center;background:#34D399;color:#0A1510;font-size:14px;font-weight:700;padding:14px 0;border-radius:8px;text-decoration:none;letter-spacing:-0.01em;margin-bottom:24px">
      자세히 보기
    </a>

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
      <a href="mailto:jsk65070506@gmail.com" style="color:#6B8274;text-decoration:underline">피드백</a>
      <br>Plusalpha · AI 기반 시황 브리핑
    </div>
  </div>
</body>
</html>`;
}

export async function sendBriefToSubscribers({ date, market, data, subscribers }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey || !subscribers?.length) return { sent: 0, failed: 0 };

  const label = MARKET_LABELS[market] || market;
  const subject = `[Plusalpha] ${formatDate(date)} ${label} 시황 브리핑`;

  let sent = 0, failed = 0;
  const BATCH_SIZE = 50;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${sub.unsubscribe_token}`;
        const html = buildBriefHtml({ date, market, data, unsubscribeUrl });

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || "Plusalpha <onboarding@resend.dev>",
            to: sub.email,
            subject,
            html,
          }),
        });

        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          throw new Error(`Resend 오류 ${res.status}: ${errText.slice(0, 100)}`);
        }

        return await res.json();
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        failed++;
        console.error("[brief] 개별 발송 실패:", r.reason?.message);
      }
    }

    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { sent, failed };
}
