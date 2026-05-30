// pages/api/analyze-screenshot.js
// 증권사·거래소 앱 스크린샷 → Claude Vision → 자산 목록 추출
export const config = {
  api: { bodyParser: { sizeLimit: "20mb" } },
  maxDuration: 30,
};

const PROMPT = `아래 이미지는 한국 증권사·거래소 앱의 보유 자산 화면입니다.
이미지에서 보유 자산 목록을 추출해주세요.

반드시 아래 JSON 형식으로만 응답하세요.
다른 텍스트는 절대 포함하지 마세요.

{
  "assets": [
    {
      "name": "자산명 (예: 삼성전자, 비트코인, NVDA)",
      "value": 숫자만 (원화 기준, 예: 1500000),
      "currency": "KRW 또는 USD"
    }
  ],
  "confidence": "high 또는 low",
  "note": "인식이 불확실한 항목이 있으면 여기에 설명"
}

주의사항:
- 금액은 숫자만, 쉼표·원·달러 기호 제거
- 인식 불가능한 항목은 제외
- 수익률·수익금은 추출하지 말 것 (현재 평가금액만)
- USD 자산은 KRW 환산하지 말고 USD 그대로`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { imageBase64 } = req.body || {};
  if (!imageBase64) {
    return res.status(400).json({ error: "imageBase64 필드가 필요합니다", assets: [] });
  }

  const apiKey = process.env.KKUGI_ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY 미설정", assets: [] });
  }

  // base64에서 media type 추출 (data:image/jpeg;base64,... 형식 지원)
  let mediaType = "image/jpeg";
  let base64Data = imageBase64;
  const dataUrlMatch = imageBase64.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
  if (dataUrlMatch) {
    mediaType = dataUrlMatch[1];
    base64Data = dataUrlMatch[2];
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[analyze-screenshot] Anthropic API error:", response.status, errText);
      return res.status(502).json({ error: "인식 실패", assets: [] });
    }

    const data = await response.json();
    const rawText = data?.content?.[0]?.text || "";

    // JSON 파싱
    let parsed;
    try {
      // 코드블록이 포함된 경우 제거
      const cleaned = rawText.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error("[analyze-screenshot] JSON parse error:", parseErr, "raw:", rawText);
      return res.status(200).json({ error: "인식 실패 — JSON 파싱 오류", assets: [] });
    }

    return res.status(200).json({
      assets: parsed.assets || [],
      confidence: parsed.confidence || "low",
      note: parsed.note || "",
    });
  } catch (err) {
    console.error("[analyze-screenshot] fetch error:", err);
    return res.status(500).json({ error: "인식 실패", assets: [] });
  }
}
