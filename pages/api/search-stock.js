// pages/api/search-stock.js
// Yahoo Finance 종목 검색 프록시 (CORS 우회)

export default async function handler(req, res) {
  const { q, market } = req.query;

  if (!q || !q.trim()) {
    return res.status(400).json({ error: "검색어가 없습니다", quotes: [] });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&lang=ko&region=KR&quotesCount=8&newsCount=0`;
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PlusAlpha/1.0)" },
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: "Yahoo API 오류", quotes: [] });
    }

    const data = await response.json();
    let quotes = data.quotes || [];

    if (market === "us") {
      quotes = quotes.filter((q) =>
        !q.symbol.includes(".") && ["EQUITY", "ETF"].includes(q.quoteType)
      );
    } else if (market === "kr") {
      quotes = quotes.filter((q) =>
        q.symbol.endsWith(".KS") || q.symbol.endsWith(".KQ")
      );
    }

    const slimmed = quotes.slice(0, 8).map((q) => ({
      symbol: q.symbol,
      shortname: q.shortname || null,
      longname: q.longname || null,
      quoteType: q.quoteType,
      exchange: q.exchange || null,
    }));

    return res.status(200).json({ quotes: slimmed });
  } catch (err) {
    console.error("Stock search error:", err);
    return res.status(500).json({ error: err.message, quotes: [] });
  }
}
