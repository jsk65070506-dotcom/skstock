// pages/api/auto-brief.js
// 매일 09:00 KST (00:00 UTC) Vercel Cron으로 자동 실행
// 수동 트리거: POST /api/auto-brief  Authorization: Bearer {CRON_SECRET}

export const config = { maxDuration: 60 };

import { supabase } from "../../lib/supabase";

// ── JSON 스키마 (analyze.js 와 동일) ─────────────────────────────
const JSON_SCHEMA = `{
  "sentiment": "bullish" | "bearish",
  "oneLineSummary": "한 줄 요약 (40자 이내)",
  "summary": "AI 시황 요약 (200자 이내)",
  "issues": [
    { "id": 1, "sentiment": "bullish", "sector": "섹터명", "title": "뉴스 제목", "tickers": ["티커"], "body": "상세 내용 (120자 이내)" }
  ],
  "picks": [
    { "ticker": "티커", "name": "종목명", "action": "BUY", "reason": "이유 (80자 이내)" }
  ],
  "sectors": [
    { "name": "섹터명", "score": 75, "trend": "▲ +1.2%", "note": "메모" }
  ]
}`;

const RULES = `규칙:
- issues는 가장 많이 보도된 뉴스를 중요도 순으로 최대 5개
- picks는 BUY/SELL/WATCH 중 하나, 최대 5개 (해당 시장에 맞는 자산/종목으로)
- sectors는 해당 시장 주요 섹터 기준 최대 8개
- 뉴스 데이터가 부족하더라도 최대한 일반적인 시황을 반영하여 결과 생성`;

// ── 시장별 뉴스 소스 ────────────────────────────────────────────
// batch=a → us, kr, crypto  (cron 00:00 UTC)
// batch=b → realty, frac    (cron 00:10 UTC)
const ALL_MARKETS = [
  {
    key: "us",
    batch: "a",
    label: "미국 주식시장",
    sources: [
      "https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101&section_id2=255",
      "https://www.investing.com/news/stock-market-news",
    ],
  },
  {
    key: "kr",
    batch: "a",
    label: "한국 주식시장",
    sources: [
      "https://finance.naver.com/news/news_list.naver?mode=LSS2D&section_id=101&section_id2=258",
      "https://www.hankyung.com/finance",
    ],
  },
  {
    key: "crypto",
    batch: "a",
    label: "가상자산(암호화폐) 시장",
    sources: [
      "https://kr.cointelegraph.com/news",
      "https://www.coindeskkorea.com/news/",
    ],
  },
  {
    key: "realty",
    batch: "b",
    label: "한국 부동산 시장",
    sources: [
      "https://land.naver.com/news/landNews.naver",
      "https://www.hankyung.com/realestate",
    ],
  },
  {
    key: "frac",
    batch: "b",
    label: "조각투자 시장(부동산·음악·미술·명품 등 실물자산 조각투자)",
    sources: [
      "https://www.hankyung.com/economy",
      "https://www.tokenpost.kr/news",
    ],
  },
];

// ── URL → 텍스트 (Jina AI Reader) ───────────────────────────────
async function fetchUrlText(url) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(`https://r.jina.ai/${url}`, {
      signal: ctrl.signal,
      headers: { Accept: "text/plain" },
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const text = (await r.text()).slice(0, 2000);
    return `[출처: ${url}]\n${text}`;
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
  // 1. 뉴스 병렬 수집
  const fetched = await Promise.allSettled(market.sources.map(fetchUrlText));
  const texts = fetched
    .filter((r) => r.status === "fulfilled" && r.value)
    .map((r) => r.value);

  const combinedText = texts.length > 0
    ? texts.join("\n\n---\n\n")
    : `${market.label} 최신 동향을 분석해주세요. 오늘 날짜: ${date}`;

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
      max_tokens: 1500,
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

  return { key: market.key, ok: true, sourcesUsed: texts.length };
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
      summary.push({ market: m.key, status: "ok", sourcesUsed: result.sourcesUsed });
      console.log(`[auto-brief] ✓ ${m.key} 저장 완료`);
    } catch (err) {
      summary.push({ market: m.key, status: "error", error: String(err?.message || err) });
      console.error(`[auto-brief] ✗ ${m.key} 실패:`, err?.message);
    }
  }

  const successCount = summary.filter((r) => r.status === "ok").length;
  console.log(`[auto-brief] 완료: ${date} batch=${batch} — ${successCount}/${MARKETS.length} 성공`);

  return res.status(200).json({
    date,
    batch,
    successCount,
    totalCount: MARKETS.length,
    results: summary,
  });
}
