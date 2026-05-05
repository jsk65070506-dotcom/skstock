// pages/api/analyze.js
export const config = {
  api: { bodyParser: { sizeLimit: "25mb" } },
  maxDuration: 60,
};

const JSON_SCHEMA = `{
  "sentiment": "bullish" | "bearish",
  "oneLineSummary": "한 줄 요약 (40자 이내)",
  "summary": "AI 시황 요약 (200자 이내)",
  "issues": [
    { "id": 1, "sentiment": "bullish", "sector": "섹터명", "title": "뉴스 제목", "tickers": ["티커 또는 종목/자산명"], "body": "상세 내용 (120자 이내)" }
  ],
  "picks": [
    { "ticker": "티커 또는 자산명", "name": "종목/자산 명칭", "signal": "긍정", "reason": "이유 (80자 이내)" }
  ],
  "sectors": [
    { "name": "섹터명", "score": 75, "trend": "▲ +1.2%", "note": "메모" }
  ]
}`;

const RULES = `규칙:
- issues는 가장 많이 보도된 뉴스를 중요도 순으로 최대 5개
- picks signal은 "긍정" | "부정" | "중립" 중 하나, 최대 5개 (해당 시장에 맞는 자산/종목으로)
- sectors는 해당 시장 주요 섹터 기준 최대 8개`;

// Jina AI Reader로 URL → 본문 텍스트 변환 (5초 타임아웃)
async function fetchUrlText(url) {
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    const r = await fetch(jinaUrl, {
      signal: ctrl.signal,
      headers: { "Accept": "text/plain" },
    });
    clearTimeout(timer);
    if (!r.ok) return null;
    const text = (await r.text()).slice(0, 3000);
    return `[출처: ${url}]\n${text}`;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { images, market, analystNotes, textContent } = req.body || {};
  const hasImages = images?.length > 0;
  const hasText = !!textContent?.trim();
  const hasNotes = !!analystNotes?.trim();

  // 이미지도 없고 텍스트도 없을 때 → analystNotes를 메인 콘텐츠로 승격
  const effectiveTextContent = hasText ? textContent?.trim() : (!hasImages && hasNotes ? analystNotes.trim() : null);
  const useTextPath = !hasImages;

  if (!hasImages && !effectiveTextContent) return res.status(400).json({ error: "분석할 콘텐츠가 없습니다. 스크린샷, 링크, 텍스트 중 하나를 입력해주세요." });
  if (!process.env.KKUGI_ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY 미설정" });

  const marketLabel =
    market === "us"     ? "미국 주식시장" :
    market === "kr"     ? "한국 주식시장" :
    market === "realty" ? "한국 부동산 시장" :
    market === "crypto" ? "가상자산(암호화폐) 시장" :
    market === "frac"   ? "조각투자 시장(부동산·음악·미술·명품 등 실물자산 조각투자)" :
    "주식시장";

  let content;

  // analystNotes가 메인 콘텐츠로 승격된 경우 중복 전달 방지
  const effectiveNotes = effectiveTextContent === analystNotes?.trim() ? null : (analystNotes?.trim() || null);

  if (hasImages) {
    // 스크린샷 기반 (주식)
    content = [
      ...images.map((img) => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.base64 },
      })),
      {
        type: "text",
        text: `이 스크린샷들은 ${marketLabel} 관련 뉴스/데이터 화면입니다.${effectiveNotes ? `\n\n📋 아래는 유료 분석가 리포트 요약입니다. 스크린샷 분석과 함께 이 내용을 크로스체크하여 더 정확한 시황을 작성하세요:\n\n${effectiveNotes}\n\n---` : ""}
모든 스크린샷을 종합해서 시황 정보를 추출하고, 아래 JSON 형식으로만 응답하세요. 마크다운 없이 순수 JSON만.

${RULES}

${JSON_SCHEMA}`,
      },
    ];
  } else {
    // 텍스트/URL 기반 — Jina AI Reader로 URL 본문 추출
    const URL_REGEX = /https?:\/\/[^\s\)\]\}"'<>]+/g;
    const urls = [...new Set(effectiveTextContent.match(URL_REGEX) || [])].slice(0, 5);
    const plainText = effectiveTextContent.replace(URL_REGEX, "").replace(/\s+/g, " ").trim();

    // URL 병렬 처리 (전체 20초 상한)
    const fetchedParts = urls.length > 0
      ? await Promise.race([
          Promise.all(urls.map(fetchUrlText)),
          new Promise(resolve => setTimeout(() => resolve([]), 20000)),
        ])
      : [];

    const combinedText = [
      plainText && `[직접 입력 텍스트]\n${plainText}`,
      ...fetchedParts,
    ].filter(Boolean).join("\n\n---\n\n");

    const finalText = combinedText || effectiveTextContent;

    content = [
      {
        type: "text",
        text: `다음은 ${marketLabel} 관련 뉴스 및 분석 자료입니다.${effectiveNotes ? `\n\n📋 아래는 유료 분석가 리포트 요약입니다. 자료 분석과 함께 이 내용을 크로스체크하여 더 정확한 시황을 작성하세요:\n\n${effectiveNotes}\n\n---` : ""}

===== 수집된 자료 =====
${finalText}
======================

위 자료를 종합해서 ${marketLabel} 시황 정보를 추출하고, 아래 JSON 형식으로만 응답하세요. 마크다운 없이 순수 JSON만.

${RULES}

${JSON_SCHEMA}`,
      },
    ];
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.KKUGI_ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        messages: [{ role: "user", content }],
      }),
    });

    const rawText = await response.text();
    let json;
    try { json = JSON.parse(rawText); }
    catch { return res.status(500).json({ error: "Anthropic 응답 파싱 실패", detail: rawText.slice(0, 500) }); }

    if (!response.ok) {
      console.error("Anthropic API error:", json);
      return res.status(response.status).json({
        error: json.error?.message || "API 호출 실패",
        type: json.error?.type,
      });
    }

    const raw = json.content?.find((b) => b.type === "text")?.text || "";
    if (!raw) return res.status(500).json({ error: "AI 응답 비어있음", detail: JSON.stringify(json).slice(0, 500) });

    const clean = raw.replace(/```json|```/g, "").trim();
    let parsed;
    try { parsed = JSON.parse(clean); }
    catch { return res.status(500).json({ error: "AI JSON 파싱 실패", detail: raw.slice(0, 500) }); }

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ error: "서버 오류: " + err.message });
  }
}
