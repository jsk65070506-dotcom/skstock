// pages/api/unsubscribe.js
import { supabase } from "../../lib/supabase";

export default async function handler(req, res) {
  const { token } = req.query;

  if (!token) return res.redirect("/unsubscribed?error=1");

  try {
    const { error } = await supabase
      .from("subscribers")
      .update({ is_active: false })
      .eq("unsubscribe_token", token);

    if (error) throw error;
    return res.redirect("/unsubscribed");
  } catch (err) {
    console.error("[unsubscribe] 오류:", err?.message);
    return res.redirect("/unsubscribed?error=1");
  }
}
