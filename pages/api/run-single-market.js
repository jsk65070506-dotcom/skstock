// pages/api/run-single-market.js
// 단일 시장만 처리하는 진단용 엔드포인트 (관리자 전용)
// 호출: GET /api/run-single-market?market=us&bypass=skrun2026
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const JSON_SCHEMA = `{
  "sentiment": "bullish 또는 bearish",
  "oneLineSummary": "한 줄 요약 (30자 이내)",
  "summary": "전체 요약 (100자 이내)",
  "issues": [{ "title": "이슈 제목", "sentiment": "bullish 또는 bearish", "sector": "섹터명" }],
  "picks": [{ "ticker": "티커", "name": "종목명", "signal": "긍정", "reason": "이유 (50자 이내)" }],
  "sectors": ["섹터1"]
}`;

const MARKET_CONFIGS = {
  us: {
    label: "미국 주식시장",
    queries: ["S&P500 stock market", "NASDAQ today", "US stocks news", "Federal Reserve"],
  },
  kr: {
    label: "한국 주식시장",
    queries: ["코스피 오늘", "코스닥 시황", "한국 주식 뉴스", "외국인 매매"],
  },
  crypto: {
    label: "가상자산(암호화폐) 시장",
    queries: ["bitcoin price today", "ethereum crypto news", "cryptocurrency market"],
  },
  realty: {
    label: "실물자산 시장",
    queries: ["조각투자 뉴스", "STO 증권형토큰", "건물 조각투자"],
  },
};

async function fetchGoogleNewsRSS(query) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`;
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    if (!res.ok) return [];
    const text = await res.text();
    const items = [];
    const re = /<item>[\s\S]*?<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<\/item>/g;
    let m;
    while ((m = re.exec(text)) && items.length < 5) {
      const title = m[1].replace(/<!\[CDATA\[|\]\]>/g, "").trim();
      const link  = m[2].trim();
      if (title && link) items.push({ title, link });
    }
    return items;
  } catch {
    return [];
  }
}

function getKstDateString() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.query.bypass !== "skrun2026") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const marketKey = req.query.market || "us";
  const market = MARKET_CONFIGS[marketKey];
  if (!market) {
    return res.status(400).json({ error: `알 수 없는 market: ${marketKey}`, available: Object.keys(MARKET_CONFIGS) });
  }

  const steps = [];
  const t0 = Date.now();

  // ── STEP 1: 환경변수 확인 ──────────────────────────────────────
  const apiKey = process.env.KKUGI_ANTHROPIC_API_KEY;
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  steps.push({
    step: "env_check",
    hasApiKey: !!apiKey,
    hasSupaUrl: !!supaUrl,
    hasSupaKey: !!supaKey,
    elapsed: Date.now() - t0,
  });

  if (!apiKey) return res.status(500).json({ error: "KKUGI_ANTHROPIC_API_KEY 미설정", steps });

  // ── STEP 2: 뉴스 수집 ─────────────────────────────────────────
  let allItems = [];
  try {
    const rssResults = await Promise.allSettled(
      market.queries.map((q) => fetchGoogleNewsRSS(q))
    );
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
    steps.push({ step: "news_fetch", count: allItems.length, elapsed: Date.now() - t0 });
  } catch (e) {
    steps.push({ step: "news_fetch", error: e.message, elapsed: Date.now() - t0 });
  }

  // ── STEP 3: Claude API 호출 ────────────────────────────────────
  const date = getKstDateString();
  const headlines = allItems.slice(0, 10).map((i) => `- ${i.title}`).join("\n");
  const prompt = allItems.length > 0
    ? `다음은 ${date} ${market.label} 관련 뉴스 헤드라인입니다.\n\n${headlines}\n\n아래 JSON 스키마에 맞게 시황을 분석하세요:\n${JSON_SCHEMA}\n\n규칙:\n- picks signal은 "긍정"|"부정"|"중립" 중 하나, 최대 3개\n- JSON 외 다른 텍스트 없이 순수 JSON만 출력`
    : `오늘 날짜는 ${date}입니다. ${market.label}의 최근 시황 흐름을 AI 지식 기반으로 분석해 주세요.\n\n${JSON_SCHEMA}\n\n규칙:\n- JSON 외 다른 텍스트 없이 순수 JSON만 출력`;

  let parsed;
  try {
    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const aiStatus = aiRes.status;
    if (!aiRes.ok) {
      const errText = await aiRes.text().catch(() => "");
      steps.push({ step: "claude_api", status: aiStatus, error: errText.slice(0, 300), elapsed: Date.now() - t0 });
      return res.status(500).json({ error: `Claude API 오류: ${aiStatus}`, steps });
    }

    const aiJson = await aiRes.json();
    const raw = aiJson.content?.find((b) => b.type === "text")?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();

    try {
      parsed = JSON.parse(clean);
      steps.push({ step: "claude_api", status: aiStatus, parsed: true, oneLineSummary: parsed.oneLineSummary, elapsed: Date.now() - t0 });
    } catch {
      steps.push({ step: "claude_api", status: aiStatus, parseError: true, raw: clean.slice(0, 300), elapsed: Date.now() - t0 });
      return res.status(500).json({ error: "AI JSON 파싱 실패", steps });
    }
  } catch (e) {
    steps.push({ step: "claude_api", error: e.message, elapsed: Date.now() - t0 });
    return res.status(500).json({ error: `Claude API 호출 실패: ${e.message}`, steps });
  }

  // ── STEP 4: Supabase 저장 ─────────────────────────────────────
  try {
    const { error } = await supabaseAdmin
      .from("market_briefings")
      .upsert(
        {
          market: marketKey,
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

    if (error) {
      steps.push({ step: "supabase_upsert", error: error.message, code: error.code, elapsed: Date.now() - t0 });
      return res.status(500).json({ error: `Supabase 저장 실패: ${error.message}`, steps });
    }

    steps.push({ step: "supabase_upsert", ok: true, elapsed: Date.now() - t0 });
  } catch (e) {
    steps.push({ step: "supabase_upsert", error: e.message, elapsed: Date.now() - t0 });
    return res.status(500).json({ error: `Supabase 저장 예외: ${e.message}`, steps });
  }

  return res.status(200).json({
    ok: true,
    market: marketKey,
    date,
    steps,
    totalElapsed: Date.now() - t0,
  });
}
