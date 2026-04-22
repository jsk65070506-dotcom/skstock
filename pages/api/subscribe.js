// pages/api/subscribe.js
import { supabase } from "../../lib/supabase";
import { sendWelcomeEmail } from "../../lib/emails/welcome";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.body || {};
  if (!email || !EMAIL_REGEX.test(email)) {
    return res.status(400).json({ success: false, message: "올바른 이메일 주소를 입력해주세요" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // 기존 구독자 확인
    const { data: existing } = await supabase
      .from("subscribers")
      .select("id, is_active, unsubscribe_token")
      .eq("email", normalizedEmail)
      .single();

    if (existing) {
      if (existing.is_active) {
        // 이미 활성 구독 중
        return res.status(200).json({
          success: true,
          isAlreadySubscribed: true,
          message: "이미 구독 중이에요. 감사합니다 :)",
        });
      } else {
        // 해지했던 유저 → 재활성화
        await supabase
          .from("subscribers")
          .update({ is_active: true, subscribed_at: new Date().toISOString() })
          .eq("id", existing.id);

        sendWelcomeEmail({ email: normalizedEmail, unsubscribeToken: existing.unsubscribe_token }).catch(() => {});
        return res.status(200).json({ success: true, message: "구독이 다시 시작됐어요 ☕" });
      }
    }

    // 신규 구독
    const { data: newSub, error } = await supabase
      .from("subscribers")
      .insert({ email: normalizedEmail })
      .select("unsubscribe_token")
      .single();

    if (error) throw error;

    sendWelcomeEmail({ email: normalizedEmail, unsubscribeToken: newSub.unsubscribe_token }).catch(() => {});

    return res.status(201).json({ success: true, message: "구독 완료! 내일 아침 9시에 첫 브리핑이 도착해요 ☕" });

  } catch (err) {
    console.error("[subscribe] 오류:", err?.message);
    return res.status(500).json({ success: false, message: "잠시 후 다시 시도해주세요" });
  }
}
