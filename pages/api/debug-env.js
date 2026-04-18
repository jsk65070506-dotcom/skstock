export default function handler(req, res) {
  res.json({
    ANTHROPIC: process.env.KKUGI_ANTHROPIC_API_KEY ? process.env.KKUGI_ANTHROPIC_API_KEY.slice(0,15) + "..." : "MISSING",
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? "OK" : "MISSING",
    ALL_KEYS: Object.keys(process.env).filter(k => k.includes("ANTHRO") || k.includes("SUPA")).join(", ") || "none found",
  });
}
