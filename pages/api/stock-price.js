// pages/api/stock-price.js
// Yahoo Finance v8 chart API 프록시 (v7 quote보다 차단 낮음)

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "application/json",
  "Accept-Language": "en-US,en;q=0.9",
  "Referer": "https://finance.yahoo.com/",
  "Origin": "https://finance.yahoo.com",
};

export default async function handler(req, res) {
  // 응답 캐시: 5분
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  const { symbol } = req.query;
  if (!symbol) return res.status(400).json({ error: "symbol이 없습니다" });

  // ── 1차: v8 chart API ─────────────────────────────────────────
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const r = await fetch(url, { headers: HEADERS });
    if (r.ok) {
      const data = await r.json();
      const meta = data.chart?.result?.[0]?.meta;
      if (meta?.regularMarketPrice) {
        return res.status(200).json({
          symbol: meta.symbol,
          price: meta.regularMarketPrice,
          currency: meta.currency,
          name: meta.shortName || meta.symbol,
        });
      }
    }
  } catch (_) {}

  // ── 2차: v7 quote API (fallback) ─────────────────────────────
  try {
    const url2 = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const r2 = await fetch(url2, { headers: HEADERS });
    if (r2.ok) {
      const data2 = await r2.json();
      const result = data2.quoteResponse?.result?.[0];
      if (result?.regularMarketPrice) {
        return res.status(200).json({
          symbol: result.symbol,
          price: result.regularMarketPrice,
          currency: result.currency,
          name: result.shortName || result.longName,
        });
      }
    }
  } catch (_) {}

  return res.status(503).json({ error: "시세 조회 실패 (Yahoo Finance 일시 차단)" });
}
