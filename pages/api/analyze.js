// pages/api/analyze.js
export const config = {
  api: { bodyParser: { sizeLimit: "25mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { images, market, analystNotes } = req.body || {};
  if (!images?.length) return res.status(400).json({ error: "이미지가 없습니다" });
  if (!process.env.KKUGI_ANTHROPIC_API_KEY) return res.status(500).json({ error: "ANTHROPIC_API_KEY 미설정" });

  const marketLabel = market === "us" ? "미국 주식시장" : "한국 주식시장";

  const content = [
    ...images.map((img) => ({
      type: "image",
      source: { type: "base64", media_type: img.mediaType, data: img.base64 },
    })),
    {
      type: "text",
      text: `이 스크린샷들은 ${marketLabel} 관련 뉴스/데이터 화면입니다.${analystNotes ? `\n\n📋 아래는 유료 분석가 리포트 요약입니다. 스크린샷 분석과 함께 이 내용을 크로스체크하여 더 정확한 시황을 작성하세요:\n\n${analystNotes}\n\n---` : ""}
모든 스크린샷을 종합해서 시황 정보를 추출하고, 아래 JSON 형식으로만 응답하세요. 마크다운 없이 순수 JSON만.

규칙:
- issues는 여러 스크린샷에서 많이 보도된 뉴스를 중요도 순으로 최대 5개
- picks는 BUY/SELL/WATCH 중 하나, 최대 5개
- sectors는 해당 시장 주요 섹터 기준 최대 8개

{
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
}`,
    },
  ];

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
        max_tokens: 2000,
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
