// pages/api/stock-price.js
// Yahoo Finance 종목 현재가 조회 프록시

export default async function handler(req, res) {
  const { symbol } = req.query;

  if (!symbol) {
    return res.status(400).json({ error: "symbol이 없습니다" });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbol)}`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PlusAlpha/1.0)" },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Yahoo API 오류" });
    }

    const data = await response.json();
    const result = data.quoteResponse?.result?.[0];

    if (!result) {
      return res.status(404).json({ error: "종목을 찾을 수 없습니다" });
    }

    return res.status(200).json({
      symbol: result.symbol,
      price: result.regularMarketPrice,
      currency: result.currency,
      name: result.shortName || result.longName,
    });
  } catch (err) {
    console.error("Price fetch error:", err);
    return res.status(500).json({ error: err.message });
  }
}
