// pages/api/auto-brief.js
import { createClient } from "@supabase/supabase-js";
import { sendBriefToSubscribers } from "../../lib/emails/brief";
import { sendDailyBriefing } from "../../lib/sendDailyBriefing";
import {
  createBriefRun,
  completeBriefRun,
  failBriefRun,
  getKstDateString,
} from "../../lib/ops/logging";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ── AI 응답 스키마 (signal 기반) ──────────────────────────────────
const JSON_SCHEMA = `{
  "sentiment": "bullish 또는 bearish",
  "oneLineSummary": "한 줄 요약 (30자 이내)",
  "summary": "전체 요약 (100자 이내)",
  "issues": [
    { "title": "이슈 제목", "sentiment": "bullish 또는 bearish", "sector": "섹터명" }
  ],
  "picks": [
    { "ticker": "티커", "name": "종목명", "signal": "긍정", "reason": "이유 (50자 이내)" }
  ],
  "sectors": ["섹터1", "섹터2"]
}`;

const RULES = `규칙:
- picks signal 은 "긍정" | "부중" | "중립" 중 하나, 최대 3개
- picks 는 투자 권유가 아닌 시황 참고용 정보임을 전제로 작성
- 모든 필드를 빠짐없이 채울 것
- JSON 외 다른 텍스트 없이 순수 JSON만 출력`;

// ── 시장 정의 ────────────────────────────────────────────────────
const ALL_MARKETS = [
  {
    key: "us",
    batch: "a",
    label: "미국 주식시장",
    queries: ["S&P500 stock market", "NASDAQ today", "US stocks news", "Federal Reserve"],
  },
  {
    key: "kr",
    batch: "a",
    label: "한국 주식시장",
    queries: ["코스피 오늘", "코스닥 시황", "한국 주식 뉴스", "외국인 매매"],
  },
  {
    key: "crypto",
    batch: "b",
    label: "가상자산(암호화폐) 시장",
    queries: ["bitcoin price today", "ethereum crypto news", "cryptocurrency market"],
  },
  {
    key: "realty",
    batch: "b",
    label: "실물자산 시장 (조각투자·STO)",
    queries: ["조각투자 뉴스", "STO 증권형토큰", "음악 조각투자", "한우 조각투자", "건물 조각투자"],
  },
];

// ── 뉴스 수집 ────────────────────────────────────────────────────
async function fetchGoogleNewsRSS(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    const text = await res.text();
    const items = [];
    const re = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
    let m;
    while ((m = re.exec(text)) && items.length < 5) {
      items.push({ title: m[1].trim(), link: m[2].trim() });
    }
    return items;
  } catch {
    return [];
  }
}

async function fetchArticleBody(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const text = await res.text();
    return text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 800);
  } catch {
    return "";
  }
}

// ── KST 오늘 날짜 ────────────────────────────────────────────────
function getTodayKST() {
  return getKstDateString();
}

// ── AI 응답 호환성 정규화 ─────────────────────────────────────────
/**
 * 구버전(action: BUY/SELL/WATCH) → 신버전(signal: 긍정/부정/중립) 변환
 */
function normalizeAnalysisPayload(data) {
  if (!data || typeof data !== "object") return data;

  const ACTION_MAP = { BUY: "긍정", SELL: "부정", WATCH: "중립" };

  const picks = (data.picks || []).map((pick) => {
    if (pick.signal) return pick; // 이미 신버전
    const signal = ACTION_MAP[pick.action] || "중립";
    const { action: _removed, ...rest } = pick;
    return { ...rest, signal };
  });

  return { ...data, picks };
}

// ── 시장 분석 ────────────────────────────────────────────────────
async function processMarket(market, date) {
  // 1. 뉴스 헤드라인 수집
  const rssResults = await Promise.allSettled(
    market.queries.map((q) => fetchGoogleNewsRSS(q))
  );

  const allItems = [];
  const seen = new Set();
  for (const r of rssResults) {
    if (r.status !== "fulfilled") continue;
    for (const item of r.value) {
      if (!seen.has(item.link)) {
        seen.add(item.link);
        allItems.push(item);
      }
    }
  }

  // 뉴스가 없으면 AI 자체 지식으로 분석 (fallback)
  const useAiFallback = allItems.length === 0;

  let prompt;
  if (useAiFallback) {
    prompt = `오늘 날짜는 ${date}입니다. 뉴스 수집에 실패했으므로 ${market.label}의 최근 일반적 시황 흐름을 AI 지식 기반으로 분석해 주세요.
실제 오늘 뉴스 없이 최근 트렌드·구조적 이슈 중심으로 작성하되, picks의 reason에 "(AI 추정)" 문구를 붙여주세요.

아래 JSON 스키마에 맞게 분석하세요:
${JSON_SCHEMA}

${RULES}`;
  } else {
    // 키워드 빈도 분석
    const wordCount = {};
    for (const item of allItems) {
      item.title.split(/\s+/).forEach((w) => {
        const word = w.replace(/[^가-힣a-zA-Z0-9]/g, "");
        if (word.length > 1) wordCount[word] = (wordCount[word] || 0) + 1;
      });
    }
    const topWords = Object.entries(wordCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([w]) => w);

    const headlines = allItems
      .slice(0, 10)
      .map((item) => `- ${item.title}`)
      .join("\n");

    prompt = `다음은 ${date} ${market.label} 관련 뉴스 헤드라인입니다.

${headlines}

핵심 키워드: ${topWords.join(", ")}

아래 JSON 스키마에 맞게 시황을 분석하세요:
${JSON_SCHEMA}

${RULES}`;
  }

  // 2. Claude API 호출

  const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.KKUGI_ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!aiRes.ok) throw new Error(`AI API 오류 (${market.key}): ${aiRes.status}`);

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

  // 호환성 정규화 (action → signal)
  parsed = normalizeAnalysisPayload(parsed);

  // 3. Supabase 저장
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

  return { key: market.key, ok: true, headlinesUsed: allItems.length, aiFallback: useAiFallback, data: parsed };
}

// ── 텔레그램 알림 ────────────────────────────────────────────────
async function sendTelegramBrief({ date, batch, summary }) {
  const token  = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const successCount = summary.filter((r) => r.status === "ok").length;
  const allOk = successCount === summary.length;
  const batchLabel = batch === "a" ? "미국·한국 주식" : "가상자산·부동산";
  const [, m, d] = date.split("-");
  const dateLabel = `${parseInt(m)}월 ${parseInt(d)}일`;
  const icon = allOk ? "✅" : "⚠️";

  const lines = summary.map((r) => {
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
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        disable_web_page_preview: true,
      }),
    });
  } catch (e) {
    console.error("[auto-brief] 텔레그램 발송 실패:", e?.message);
  }
}

// ── 운영자 이메일 알림 ───────────────────────────────────────────
const MARKET_LABELS = { us: "미국 주식", kr: "한국 주식", crypto: "가상자산", realty: "부동산" };

async function sendAdminEmail({ date, batch, summary }) {
  const resendKey = process.env.RESEND_API_KEY;
  const toEmail   = process.env.BRIEF_NOTIFY_EMAIL;
  if (!resendKey || !toEmail) return;

  const successCount = summary.filter((r) => r.status === "ok").length;
  const allOk = successCount === summary.length;
  const batchLabel = batch === "a" ? "09:00 (미국·한국)" : "09:10 (가상자산·부동산)";

  const rows = summary
    .map((r) => {
      const icon   = r.status === "ok" ? "✅" : "❌";
      const label  = MARKET_LABELS[r.market] || r.market;
      const detail = r.status === "ok"
        ? `헤드라인 ${r.headlinesUsed}건 분석`
        : `오류: ${r.error}`;
      return `<tr><td style="padding:6px 12px">${icon}</td><td style="padding:6px 12px"><b>${label}</b></td><td style="padding:6px 12px;color:#555">${detail}</td></tr>`;
    })
    .join("");

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
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Plusalpha <onboarding@resend.dev>",
        to: [toEmail],
        subject,
        html,
      }),
    });
  } catch (e) {
    console.error("[auto-brief] 운영자 이메일 발송 실패:", e?.message);
  }
}

// ── 메인 핸들러 ─────────────────────────────────────────────────
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 인증 확인 (임시 bypass: ?bypass=skrun2026)
  const isBypass = req.query.bypass === "skrun2026";
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && !isBypass) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }

  if (!process.env.KKUGI_ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "KKUGI_ANTHROPIC_API_KEY 미설정" });
  }

  const batch = req.query.batch || "a";
  const MARKETS = batch === "all"
    ? ALL_MARKETS
    : ALL_MARKETS.filter((m) => m.batch === batch);

  if (MARKETS.length === 0) {
    return res.status(400).json({ error: `알 수 없는 batch: ${batch}` });
  }

  const date = getTodayKST();
  console.log(`[auto-brief] 시작: ${date} batch=${batch} markets=${MARKETS.map((m) => m.key).join(",")}`);

  // ── 중복 실행 방지 ────────────────────────────────────────────
  let runId;
  try {
    runId = await createBriefRun(batch, date);
  } catch (e) {
    console.error("[auto-brief] createBriefRun 오류:", e?.message);
  }

  if (runId === null) {
    console.log(`[auto-brief] 이미 실행됨: ${date} batch=${batch} — 스킵`);
    return res.status(200).json({
      skipped: true,
      reason: "이미 오늘 실행됨",
      date,
      batch,
    });
  }

  // ── 시장 분석 (순차 처리) ─────────────────────────────────────
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

  // 실행 완료 기록
  if (runId) {
    await completeBriefRun(runId, {
      marketsOk: successCount,
      marketsFailed: MARKETS.length - successCount,
    }).catch(() => {});
  }

  // 운영자 알림
  await sendTelegramBrief({ date, batch, summary }).catch(() => {});
  await sendAdminEmail({ date, batch, summary }).catch(() => {});

  // 데일리 통합 브리핑 발송 (4줄 요약 이메일)
  ;(async () => {
    try {
      const result = await sendDailyBriefing();
      if (!result.skipped) {
        console.log(`[auto-brief] 데일리 브리핑 발송: ${result.sent}명 성공, ${result.failed}명 실패`);
      }
    } catch (e) {
      console.error("[auto-brief] 데일리 브리핑 발송 오류:", e?.message);
    }
  })();

  // 구독자 이메일 발송 (Promise.allSettled — 실패해도 다음 시장 계속)
  ;(async () => {
    try {
      const { data: subs } = await supabase
        .from("subscribers")
        .select("email, unsubscribe_token, preferences")
        .eq("is_active", true);

      if (!subs?.length) return;

      const sendTasks = summary
        .filter((r) => r.status === "ok" && r.data)
        .map(async (result) => {
          const marketKey = result.market;
          const prefKey = marketKey === "realty" ? "realestate" : marketKey;
          const filtered = subs.filter((s) => {
            const prefs = s.preferences || {};
            return prefs[prefKey] !== false;
          });
          if (!filtered.length) return;

          const { sent, failed } = await sendBriefToSubscribers({
            date,
            market: marketKey,
            data: result.data,
            subscribers: filtered,
          });
          console.log(`[auto-brief] 구독자 발송 ${marketKey}: ${sent}명 성공, ${failed}명 실패`);
        });

      const results = await Promise.allSettled(sendTasks);
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.error(`[auto-brief] 구독자 발송 오류 (task ${i}):`, r.reason?.message);
        }
      });
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
