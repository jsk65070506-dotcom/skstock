// pages/api/auto-brief.js
// 매일 09:00 KST (00:00 UTC) Vercel Cron으로 자동 실행
// 수동 트리거: POST /api/auto-brief  Authorization: Bearer {CRON_SECRET}

export const config = { maxDuration: 60 };

import { supabase } from "../../lib/supabase";
import { sendBriefToSubscribers } from "../../lib/emails/brief";

// ── JSON 스키마 (analyze.js 와 동일) ─────────────────────────────
const JSON_SCHEMA = `{
  "sentiment": "bullish" | "bearish",
  "oneLineSummary": "한 줄 요약 (40자 이내)",
  "summary": "AI 시황 요약 (100자 이내)",
  "issues": [
    { "id": 1, "sentiment": "bullish", "sector": "섹터명", "title": "뉴스 제목", "tickers": ["티커"], "body": "상세 내용 (60자 이내)" }
  ],
  "picks": [
    { "ticker": "티커", "name": "종목명", "action": "BUY", "reason": "이유 (50자 이내)" }
  ],
  "sectors": [
    { "name": "섹터명", "score": 75, "trend": "▲ +1.2%", "note": "메모" }
  ]
}`;

const RULES = `규칙:
- issues 최대 3개: 복수 언론사에서 중복 언급된 키워드가 포함된 기사를 우선 선정 (= 더 사실에 가까운 뉴스)
- picks BUY/SELL/WATCH 중 하나, 최대 3개
- sectors 최대 5개
- [복수 언론사 공통 언급 키워드] 항목이 있으면 해당 키워드가 포함된 이슈를 issues 상위에 배치
- oneLineSummary와 summary에 "뉴스 부재", "뉴스 부족", "데이터 없음" 등 수집 실패 관련 메타 표현 절대 금지
- 반드시 완성된 JSON만 출력`;

// ── 시장별 뉴스 소스 (Google News RSS — 안정적 실시간 헤드라인) ──
// batch=a → us, kr          (cron 00:00 UTC = 09:00 KST)
// batch=b → crypto, realty  (cron 00:10 UTC = 09:10 KST)
const ALL_MARKETS = [
  {
    key: "us",
    batch: "a",
    label: "미국 주식시장",
    queries: ["나스닥 S&P500 미국 증시", "미국 주식 연준 금리 경제", "Wall Street stock market today"],
  },
  {
    key: "kr",
    batch: "a",
    label: "한국 주식시장",
    queries: ["코스피 코스닥 한국 증시", "한국 주식 외국인 반도체 삼성", "코스피 급등 급락 시황"],
  },
  {
    key: "crypto",
    batch: "b",
    label: "가상자산(암호화폐) 시장",
    queries: ["비트코인 이더리움 가상자산", "암호화폐 코인 시세 급등 급락", "Bitcoin crypto market today"],
  },
  {
    key: "realty",
    batch: "b",
    label: "한국 부동산 시장",
    queries: ["아파트 부동산 매매 전세", "부동산 정책 금리 대출 규제", "서울 아파트 집값 시장"],
  },
];

// ── Google News RSS → 헤드라인 목록 + 상위 기사 URL 반환 ────────
async function fetchGoogleNewsRSS(query) {
  try {
    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return null;
    const xml = await r.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    const parsed = items.slice(0, 25).map((item) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/)?.[1]
        || item.match(/<title>(.*?)<\/title>/)?.[1] || "";
      const link = item.match(/<link>(.*?)<\/link>/)?.[1]
        || item.match(/<guid[^>]*>(.*?)<\/guid>/)?.[1] || "";
      const src = item.match(/<source[^>]*>(.*?)<\/source>/)?.[1] || "";
      return title ? { title, link, src } : null;
    }).filter(Boolean);
    return parsed;
  } catch {
    return null;
  }
}

// ── Jina AI Reader로 기사 본문 fetch ────────────────────────────
async function fetchArticleBody(url) {
  if (!url || url.includes("news.google.com")) return null;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(`https://r.jina.ai/${url}`, {
      signal: ctrl.signal,
      headers: { Accept: "text/plain" },
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    return (await r.text()).slice(0, 1500);
  } catch {
    return null;
  }
}

// ── KST 오늘 날짜 (YYYY-MM-DD) ──────────────────────────────────
function getTodayKST() {
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  return kst.toISOString().split("T")[0];
}

// ── 단일 시장 처리 ───────────────────────────────────────────────
async function processMarket(market, date) {
  // 1단계: Google News RSS 병렬 수집 (헤드라인 목록)
  const rssResults = await Promise.allSettled(market.queries.map(fetchGoogleNewsRSS));
  const allItems = rssResults
    .filter((r) => r.status === "fulfilled" && r.value)
    .flatMap((r) => r.value);

  // 중복 키워드 빈도 분석 — 여러 언론사가 언급한 키워드일수록 신뢰도 높음
  const keywordCount = {};
  const stopWords = new Set(["및","관련","위한","대한","통해","따른","속에","으로","에서","이에","하는","있는","되는","지난","오는","이번","지속","강화","확대","하락","상승","전망","발표","예정","진행","증가","감소"]);
  allItems.forEach(({ title }) => {
    const words = title.replace(/[^가-힣a-zA-Z0-9\s]/g, " ").split(/\s+/)
      .filter(w => w.length >= 2 && !stopWords.has(w));
    words.forEach(w => { keywordCount[w] = (keywordCount[w] || 0) + 1; });
  });
  // 2개 이상 언론사가 언급한 키워드 추출 (빈도 내림차순)
  const hotKeywords = Object.entries(keywordCount)
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([w, c]) => `${w}(${c}건)`)
    .join(", ");

  const headlineText = allItems.length > 0
    ? `[수집된 헤드라인 ${allItems.length}건 — ${[...new Set(allItems.map(i=>i.src))].length}개 언론사]\n`
      + (hotKeywords ? `[복수 언론사 공통 언급 키워드: ${hotKeywords}]\n\n` : "")
      + allItems.map(i => `[${i.src}] ${i.title}`).join("\n")
    : "";

  const combinedText = headlineText || `${market.label} 최신 동향을 분석해주세요. 오늘 날짜: ${date}`;

  // 2. Claude AI 분석
  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.KKUGI_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1600,
      messages: [
        {
          role: "user",
          content: `다음은 ${market.label} 관련 최신 뉴스 자료입니다. 오늘 날짜: ${date}

===== 수집된 뉴스 =====
${combinedText}
======================

위 자료를 종합해서 ${market.label} 시황을 작성하고, 아래 JSON 형식으로만 응답하세요. 마크다운 없이 순수 JSON만.

${RULES}

${JSON_SCHEMA}`,
        },
      ],
    }),
  });

  if (!aiRes.ok) {
    const errText = await aiRes.text();
    throw new Error(`Anthropic API 오류 (${market.key}): ${errText.slice(0, 200)}`);
  }

  const aiJson = await aiRes.json();
  const raw = aiJson.content?.find((b) => b.type === "text")?.text || "";
  if (!raw) throw new Error(`AI 응답 비어있음: ${market.key}`);

  const clean = raw.replace(/```json|```/g, "").trim();
  let parsed;
  try {
    parsed = JSON.parse(clean);
  } catch {
    throw new Error(`AI JSON 파싱 실패 (${market.key}): ${clean.slice(0, 200)}`);
  }

  // 3. Supabase 저장 (upsert: 같은 market+date+batch_time이면 덮어쓰기)
  const { error } = await supabase
    .from("market_briefings")
    .upsert(
      {
        market: market.key,
        date,
        batch_time: "09:00",
        sentiment: parsed.sentiment,
        one_line_summary: parsed.oneLineSummary,
        summary: parsed.summary,
        issues: parsed.issues || [],
        picks: parsed.picks || [],
        sectors: parsed.sectors || [],
      },
      { onConflict: "market,date,batch_time" }
    );

  if (error) throw new Error(`Supabase 저장 실패 (${market.key}): ${error.message}`);

  return { key: market.key, ok: true, headlinesUsed: allItems.length, data: parsed };
}

// ── 텔레그램 알림 ────────────────────────────────────────────────
async function sendTelegramBrief({ date, batch, summary }) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const successCount = summary.filter(r => r.status === "ok").length;
  const allOk = successCount === summary.length;
  const batchLabel = batch === "a" ? "미국·한국 주식" : "가상자산·부동산";
  const [, m, d] = date.split("-");
  const dateLabel = `${parseInt(m)}월 ${parseInt(d)}일`;
  const icon = allOk ? "✅" : "⚠️";

  const lines = summary.map(r => {
    const statusIcon = r.status === "ok" ? "✓" : "✗";
    const label = { us: "미국", kr: "한국", crypto: "가상자산", realty: "부동산" }[r.market] || r.market;
    return `  ${statusIcon} ${label}`;
  });

  const text = [
    `${icon} *+α 시황 업데이트* — ${dateLabel} ${batchLabel}`,
    lines.join("\n"),
    `👉 [skstock.vercel.app](https://skstock.vercel.app)`,
  ].join("\n");

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown", disable_web_page_preview: true }),
    });
  } catch (e) {
    console.error("[auto-brief] 텔레그램 발송 실패:", e?.message);
  }
}

// ── 이메일 알림 (Resend API) ─────────────────────────────────────
const MARKET_LABELS = { us: "미국 주식", kr: "한국 주식", crypto: "가상자산", realty: "부동산" };

async function sendBriefEmail({ date, batch, summary }) {
  const resendKey = process.env.RESEND_API_KEY;
  const toEmail   = process.env.BRIEF_NOTIFY_EMAIL;
  if (!resendKey || !toEmail) return; // 키 없으면 조용히 스킵

  const successCount = summary.filter(r => r.status === "ok").length;
  const allOk = successCount === summary.length;
  const batchLabel = batch === "a" ? "09:00 (미국·한국)" : "09:10 (가상자산·부동산)";

  const rows = summary.map(r => {
    const icon  = r.status === "ok" ? "✅" : "❌";
    const label = MARKET_LABELS[r.market] || r.market;
    const detail = r.status === "ok"
      ? `헤드라인 ${r.headlinesUsed}건 분석`
      : `오류: ${r.error}`;
    return `<tr><td style="padding:6px 12px">${icon}</td><td style="padding:6px 12px"><b>${label}</b></td><td style="padding:6px 12px;color:#555">${detail}</td></tr>`;
  }).join("");

  const subject = allOk
    ? `✅ [+α] ${date} 시황 업데이트 완료 (batch ${batch})`
    : `⚠️ [+α] ${date} 시황 일부 실패 (batch ${batch}) — ${successCount}/${summary.length}`;

  const html = `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto">
  <h2 style="color:#1a1a2e">+α Plusalpha 시황 브리핑</h2>
  <p style="color:#444">${date} ${batchLabel} 배치 결과입니다.</p>
  <table style="border-collapse:collapse;width:100%">
    <thead><tr style="background:#f0f0f0">
      <th style="padding:6px 12px;text-align:left">상태</th>
      <th style="padding:6px 12px;text-align:left">시장</th>
      <th style="padding:6px 12px;text-align:left">상세</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="margin-top:16px"><a href="https://skstock.vercel.app" style="color:#6c63ff;font-weight:bold">👉 시황 보러가기</a></p>
  <p style="color:#aaa;font-size:12px">+α Plusalpha 자동 발송 — 매일 09:00 / 09:10 KST</p>
</div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Plusalpha <onboarding@resend.dev>",
        to: [toEmail],
        subject,
        html,
      }),
    });
  } catch (e) {
    console.error("[auto-brief] 이메일 발송 실패:", e?.message);
  }
}

// ── 메인 핸들러 ─────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 인증 확인 — CRON_SECRET 환경변수가 설정된 경우만 체크
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  if (!process.env.KKUGI_ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "KKUGI_ANTHROPIC_API_KEY 미설정" });
  }

  // batch 파라미터로 실행할 시장 선택 (기본: a)
  // batch=a → us, kr, crypto  (cron 00:00 UTC = 09:00 KST)
  // batch=b → realty, frac    (cron 00:10 UTC = 09:10 KST)
  // batch=all → 전체 (수동 테스트용)
  const batch = req.query.batch || "a";
  const MARKETS = batch === "all"
    ? ALL_MARKETS
    : ALL_MARKETS.filter((m) => m.batch === batch);

  if (MARKETS.length === 0) {
    return res.status(400).json({ error: `알 수 없는 batch: ${batch}` });
  }

  const date = getTodayKST();
  console.log(`[auto-brief] 시작: ${date} batch=${batch} markets=${MARKETS.map(m=>m.key).join(",")}`);

  // 순차 처리 — 60초 제한 내에 각 시장을 하나씩 완료·저장
  const summary = [];
  for (const m of MARKETS) {
    try {
      const result = await processMarket(m, date);
      summary.push({ market: m.key, status: "ok", headlinesUsed: result.headlinesUsed, data: result.data });
      console.log(`[auto-brief] ✓ ${m.key} 저장 완료`);
    } catch (err) {
      summary.push({ market: m.key, status: "error", error: String(err?.message || err) });
      console.error(`[auto-brief] ✗ ${m.key} 실패:`, err?.message);
    }
  }

  const successCount = summary.filter((r) => r.status === "ok").length;
  console.log(`[auto-brief] 완료: ${date} batch=${batch} — ${successCount}/${MARKETS.length} 성공`);

  // 운영자 이메일 + 텔레그램 알림 (실패해도 응답에 영향 없음)
  sendBriefEmail({ date, batch, summary }).catch(() => {});
  sendTelegramBrief({ date, batch, summary }).catch(() => {});

  // 구독자 이메일 발송 (성공한 시장만, 비동기 fire-and-forget)
  ;(async () => {
    try {
      const { data: subs } = await supabase
        .from("subscribers")
        .select("email, unsubscribe_token, preferences")
        .eq("is_active", true);

      if (!subs?.length) return;

      for (const result of summary) {
        if (result.status !== "ok" || !result.data) continue;
        const marketKey = result.market;
        // preferences 필터 (us, kr, crypto, realestate)
        const prefKey = marketKey === "realty" ? "realestate" : marketKey;
        const filtered = subs.filter(s => {
          const prefs = s.preferences || {};
          return prefs[prefKey] !== false; // 기본 true
        });
        if (!filtered.length) continue;

        const { sent, failed } = await sendBriefToSubscribers({
          date,
          market: marketKey,
          data: result.data,
          subscribers: filtered,
        });
        console.log(`[auto-brief] 구독자 발송 ${marketKey}: ${sent}명 성공, ${failed}명 실패`);
      }
    } catch (e) {
      console.error("[auto-brief] 구독자 발송 오류:", e?.message);
    }
  })();

  return res.status(200).json({
    date,
    batch,
    successCount,
    totalCount: MARKETS.length,
    results: summary,
  });
}
