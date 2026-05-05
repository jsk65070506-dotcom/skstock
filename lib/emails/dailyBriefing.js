// lib/emails/dailyBriefing.js
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://skstock.vercel.app";

const MARKET_LABELS = {
  us:         { label: "🇺🇸 미국 주식",   emoji: "🇺🇸" },
  kr:         { label: "🇰🇷 한국 주식",   emoji: "🇰🇷" },
  crypto:     { label: "💎 가상자산",      emoji: "💎" },
  realestate: { label: "🏢 부동산",        emoji: "🏢" },
};

function formatDateKo(dateStr) {
  // dateStr: "YYYY-MM-DD"
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const dow = new Date(y, m - 1, d).getDay();
  return `${y}년 ${m}월 ${d}일 (${weekdays[dow]})`;
}

/**
 * buildDailyBriefingHtml({ date, us, kr, crypto, realestate, keywords, unsubscribeUrl, isPreview })
 *
 * @param {string}   date         - "YYYY-MM-DD"
 * @param {string}   us           - 미국 주식 한 줄 요약
 * @param {string}   kr           - 한국 주식 한 줄 요약
 * @param {string}   crypto       - 가상자산 한 줄 요약
 * @param {string}   realestate   - 부동산 한 줄 요약
 * @param {string[]} keywords     - TOP 3 키워드 (ticker or name)
 * @param {string}   unsubscribeUrl
 * @param {boolean}  isPreview    - 미리보기 모드 배너 표시 여부
 */
export function buildDailyBriefingHtml({
  date,
  us,
  kr,
  crypto,
  realestate,
  keywords = [],
  unsubscribeUrl,
  isPreview = false,
}) {
  const dateLabel = formatDateKo(date);
  const topKeywords = keywords.slice(0, 3);

  const markets = [
    { key: "us",         summary: us         || "데이터 없음" },
    { key: "kr",         summary: kr         || "데이터 없음" },
    { key: "crypto",     summary: crypto     || "데이터 없음" },
    { key: "realestate", summary: realestate || "데이터 없음" },
  ];

  const marketRows = markets.map(({ key, summary }) => {
    const { label } = MARKET_LABELS[key];
    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #f0f0f0;vertical-align:top">
          <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:4px">${label}</div>
          <div style="font-size:14px;color:#1a1a1a;line-height:1.55">${summary}</div>
        </td>
      </tr>`;
  }).join("");

  const keywordBadges = topKeywords.length
    ? topKeywords.map(kw => `
        <span style="display:inline-block;background:#f0fdf8;color:#059669;border:1px solid #a7f3d0;border-radius:20px;font-size:12px;font-weight:600;padding:4px 12px;margin:3px 4px 3px 0">${kw}</span>
      `).join("")
    : "";

  const previewBanner = isPreview ? `
    <div style="background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 14px;margin-bottom:20px;font-size:12px;color:#92400e;font-weight:600">
      ⚠️ 미리보기 모드 — 실제 구독자에게는 발송되지 않습니다
    </div>` : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>Plusalpha 시황 브리핑</title>
</head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Helvetica Neue',Arial,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;-webkit-font-smoothing:antialiased">
  <div style="max-width:600px;margin:0 auto;padding:32px 16px">

    ${previewBanner}

    <!-- 카드 -->
    <div style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08)">

      <!-- 헤더 -->
      <div style="background:#0d1f16;padding:24px 28px 20px">
        <div style="margin-bottom:12px">
          <span style="font-size:14px;font-weight:500;color:#34d399">+</span><span style="font-family:Georgia,serif;font-style:italic;font-size:28px;color:#34d399;line-height:1">α</span>
          <span style="font-size:13px;font-weight:600;color:#6b8274;margin-left:8px;letter-spacing:-0.01em">Plusalpha</span>
        </div>
        <div style="font-size:13px;color:#6b8274">${dateLabel} 시황 브리핑</div>
        <div style="font-size:20px;font-weight:700;color:#e8efea;margin-top:6px;letter-spacing:-0.02em;line-height:1.3">
          오늘의 핵심만 4줄로 요약했어요
        </div>
      </div>

      <!-- 시장별 요약 -->
      <div style="padding:8px 28px 4px">
        <table style="width:100%;border-collapse:collapse">
          <tbody>
            ${marketRows}
          </tbody>
        </table>
      </div>

      ${topKeywords.length ? `
      <!-- 오늘의 키워드 -->
      <div style="padding:16px 28px 20px">
        <div style="font-size:11px;font-weight:700;color:#888;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:10px">오늘의 키워드</div>
        <div>${keywordBadges}</div>
      </div>` : ""}

      <!-- CTA -->
      <div style="padding:4px 28px 28px">
        <a href="${SITE_URL}" style="display:block;text-align:center;background:#059669;color:#ffffff;font-size:15px;font-weight:700;padding:15px 0;border-radius:8px;text-decoration:none;letter-spacing:-0.01em">
          더 자세히 보기 →
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
}
