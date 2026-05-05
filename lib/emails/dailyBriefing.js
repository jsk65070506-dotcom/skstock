// lib/emails/dailyBriefing.js
// Gmail 호환 table 기반 이메일 템플릿
// Gmail은 overflow:hidden / border-radius / box-shadow를 무시하므로
// bgcolor 속성 + 명시적 background-color 인라인 스타일로 처리
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://skstock.vercel.app";

const MARKET_LABELS = {
  us:         "🇺🇸 미국 주식",
  kr:         "🇰🇷 한국 주식",
  crypto:     "💎 가상자산",
  realestate: "🏢 부동산",
};

function formatDateKo(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const dow = new Date(y, m - 1, d).getDay();
  return `${y}년 ${m}월 ${d}일 (${weekdays[dow]})`;
}

/**
 * buildDailyBriefingHtml
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
  const dateLabel   = formatDateKo(date);
  const topKeywords = keywords.slice(0, 3);

  const markets = [
    { key: "us",         summary: us         || "데이터 없음" },
    { key: "kr",         summary: kr         || "데이터 없음" },
    { key: "crypto",     summary: crypto     || "데이터 없음" },
    { key: "realestate", summary: realestate || "데이터 없음" },
  ];

  // 시장별 행 (table 기반, 마지막 행은 border-bottom 없음)
  const marketRows = markets.map(({ key, summary }, i) => {
    const isLast = i === markets.length - 1;
    return `
      <tr>
        <td style="padding:14px 20px;${isLast ? "" : "border-bottom:1px solid #e8e8e8;"}background-color:#ffffff;" bgcolor="#ffffff">
          <p style="margin:0 0 4px 0;font-size:11px;font-weight:700;color:#666666;letter-spacing:0.06em;text-transform:uppercase;">
            ${MARKET_LABELS[key]}
          </p>
          <p style="margin:0;font-size:14px;color:#1a1a1a;line-height:1.6;">
            ${summary}
          </p>
        </td>
      </tr>`;
  }).join("");

  // 키워드 배지
  const keywordCells = topKeywords.length
    ? topKeywords.map(kw =>
        `<td style="padding:0 6px 0 0;">
           <span style="display:inline-block;background-color:#f0fdf4;color:#16a34a;border:1px solid #bbf7d0;border-radius:12px;font-size:12px;font-weight:600;padding:3px 10px;">${kw}</span>
         </td>`
      ).join("")
    : "";

  // 미리보기 배너
  const previewBanner = isPreview ? `
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      <tr>
        <td style="background-color:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:10px 14px;font-size:12px;color:#92400e;font-weight:600;" bgcolor="#fffbeb">
          ⚠️ 미리보기 모드 — 실제 구독자에게는 발송되지 않습니다
        </td>
      </tr>
    </table>` : "";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light only">
  <meta name="supported-color-schemes" content="light">
  <title>Plusalpha 오늘의 뉴스</title>
  <!--[if mso]>
  <noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#f4f4f4;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;" bgcolor="#f4f4f4">

  <!-- 외부 래퍼 -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f4f4;" bgcolor="#f4f4f4">
    <tr>
      <td align="center" style="padding:24px 12px;">

        <!-- 최대 너비 컨테이너 -->
        <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">

          ${previewBanner}

          <!-- ── 헤더 (다크) ── -->
          <tr>
            <td style="background-color:#0d1f16;padding:24px 24px 20px;border-radius:8px 8px 0 0;" bgcolor="#0d1f16">
              <!-- 로고 -->
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td>
                    <span style="font-size:14px;font-weight:500;color:#34d399;">+</span><span style="font-family:Georgia,serif;font-style:italic;font-size:26px;color:#34d399;line-height:1;">α</span>
                    <span style="font-size:12px;font-weight:600;color:#6b8274;margin-left:6px;">Plusalpha</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding-top:10px;">
                    <p style="margin:0;font-size:18px;font-weight:700;color:#e8efea;line-height:1.3;letter-spacing:-0.3px;">
                      ${dateLabel} 오늘의 뉴스
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── 시장별 요약 (흰 배경) ── -->
          <tr>
            <td style="background-color:#ffffff;" bgcolor="#ffffff">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                ${marketRows}
              </table>
            </td>
          </tr>

          ${topKeywords.length ? `
          <!-- ── 오늘의 키워드 ── -->
          <tr>
            <td style="background-color:#ffffff;padding:4px 20px 16px;" bgcolor="#ffffff">
              <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;color:#888888;letter-spacing:0.06em;text-transform:uppercase;">오늘의 키워드</p>
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>${keywordCells}</tr>
              </table>
            </td>
          </tr>` : ""}

          <!-- ── CTA 버튼 ── -->
          <tr>
            <td style="background-color:#ffffff;padding:4px 20px 24px;" bgcolor="#ffffff">
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color:#059669;border-radius:8px;" bgcolor="#059669">
                    <a href="${SITE_URL}" style="display:block;padding:14px 0;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;text-align:center;letter-spacing:-0.01em;">
                      더 자세히 보기 →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ── 면책 고지 ── -->
          <tr>
            <td style="padding:14px 20px;background-color:#fafafa;border-top:1px solid #e8e8e8;" bgcolor="#fafafa">
              <p style="margin:0;font-size:10px;color:#999999;line-height:1.7;">
                본 메일은 투자 권유가 아닌 정보 제공 목적입니다. 제공된 시황 정보는 AI가 뉴스 헤드라인을 기반으로 생성한 참고 자료이며, 투자 판단의 책임은 본인에게 있습니다.
              </p>
            </td>
          </tr>

          <!-- ── 푸터 ── -->
          <tr>
            <td style="padding:16px 20px;border-radius:0 0 8px 8px;background-color:#f4f4f4;" bgcolor="#f4f4f4">
              <p style="margin:0;font-size:11px;color:#aaaaaa;text-align:center;line-height:1.9;">
                <a href="${unsubscribeUrl}" style="color:#aaaaaa;text-decoration:underline;">구독 해지</a>
                &nbsp;·&nbsp;
                <a href="mailto:jsk65070506@gmail.com" style="color:#aaaaaa;text-decoration:underline;">피드백 보내기</a>
                <br>Plusalpha · AI 기반 시황 브리핑 서비스
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}
