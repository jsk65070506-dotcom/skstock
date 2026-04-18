import { supabase } from "../../lib/supabase";

const BATCH_ORDER = ["09:00", "13:00", "18:00", "23:00"];

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { market, date, batch } = req.query;

  if (!market || !date) {
    return res.status(400).json({ error: "market, date 필수" });
  }

  // 요청한 배치 및 그 이전 배치들을 우선순위대로 조회
  const batchIndex = batch ? BATCH_ORDER.indexOf(batch) : BATCH_ORDER.length - 1;
  const candidateBatches = BATCH_ORDER.slice(0, batchIndex + 1).reverse();

  const { data, error } = await supabase
    .from("market_briefings")
    .select("*")
    .eq("market", market)
    .eq("date", date)
    .in("batch_time", candidateBatches)
    .order("batch_time", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows found
    console.error("Supabase select error:", error);
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: "데이터 없음" });
  }

  return res.status(200).json(data);
}
