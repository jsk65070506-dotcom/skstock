import { supabase } from "../../../lib/supabase";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { market, date, batch_time, sentiment, one_line_summary, summary, issues, picks, sectors, indices } =
    req.body || {};

  if (!market || !date || !batch_time) {
    return res.status(400).json({ error: "market, date, batch_time 필수" });
  }

  const { data, error } = await supabase
    .from("market_briefings")
    .upsert(
      { market, date, batch_time, sentiment, one_line_summary, summary, issues, picks, sectors, indices },
      { onConflict: "market,date,batch_time" }
    )
    .select()
    .single();

  if (error) {
    console.error("Supabase upsert error:", error);
    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({ success: true, data });
}
