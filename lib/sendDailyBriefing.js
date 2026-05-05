// lib/sendDailyBriefing.js
import { supabaseAdmin } from "./supabaseAdmin";
import { getLatestBriefing } from "./getLatestBriefing";
import { buildDailyBriefingHtml } from "./emails/dailyBriefing";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://skstock.vercel.app";
const BATCH_SIZE = 50;
const BATCH_DELAY_MS = 500;

const PREVIEW_EMAIL = "jsk65070506@gmail.com";

/**
 * 단일 이메일 발송 (Resend API 직접 호출)
 */
async function sendViaResend({ to, subject, html }) {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) throw new Error("RESEND_API_KEY 미설정");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendKey}`,
    },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Plusalpha <onboarding@resend.dev>",
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Resend 오류 ${res.status}: ${errText.slice(0, 150)}`);
  }

  return await res.json();
}

/**
 * 데일리 브리핑 이메일 발송 오케스트레이터
 *
 * 환경 변수:
 *   MAIL_PREVIEW_MODE=true  → PREVIEW_EMAIL 한 명에게만 발송, 제목에 "[미리보기] " 접두어
 *
 * @returns {{ sent: number, failed: number, skipped: boolean }}
 */
export async function sendDailyBriefing() {
  const isPreview = process.env.MAIL_PREVIEW_MODE === "true";

  // 1. 오늘 브리핑 데이터 조회
  const briefing = await getLatestBriefing();
  if (!briefing) {
    console.warn("[sendDailyBriefing] 오늘 브리핑 데이터 없음 — 발송 건너뜀");
    return { sent: 0, failed: 0, skipped: true };
  }

  const { date, us, kr, crypto, realestate, keywords } = briefing;

  // 2. 구독자 목록 조회
  let subscribers;
  if (isPreview) {
    // 미리보기 모드: 관리자 이메일만
    subscribers = [{ email: PREVIEW_EMAIL, unsubscribe_token: "preview" }];
    console.log("[sendDailyBriefing] 미리보기 모드 — 대상:", PREVIEW_EMAIL);
  } else {
    const { data, error } = await supabaseAdmin
      .from("subscribers")
      .select("email, unsubscribe_token")
      .eq("is_active", true);

    if (error) {
      console.error("[sendDailyBriefing] 구독자 조회 실패:", error.message);
      return { sent: 0, failed: 0, skipped: true };
    }
    subscribers = data || [];
  }

  if (!subscribers.length) {
    console.warn("[sendDailyBriefing] 활성 구독자 없음 — 발송 건너뜀");
    return { sent: 0, failed: 0, skipped: true };
  }

  const [y, m, d] = date.split("-").map(Number);
  const subjectBase = `[Plusalpha] ${m}월 ${d}일 오늘의 뉴스`;
  const subject = isPreview ? `[미리보기] ${subjectBase}` : subjectBase;

  // 3. 배치 발송
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
    const batch = subscribers.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (sub) => {
        const unsubscribeUrl =
          sub.unsubscribe_token === "preview"
            ? `${SITE_URL}/api/unsubscribe?token=preview`
            : `${SITE_URL}/api/unsubscribe?token=${sub.unsubscribe_token}`;

        const html = buildDailyBriefingHtml({
          date,
          us,
          kr,
          crypto,
          realestate,
          keywords,
          unsubscribeUrl,
          isPreview,
        });

        return sendViaResend({ to: sub.email, subject, html });
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") {
        sent++;
      } else {
        failed++;
        console.error("[sendDailyBriefing] 발송 실패:", r.reason?.message);
      }
    }

    // 배치 간 딜레이 (마지막 배치 제외)
    if (i + BATCH_SIZE < subscribers.length) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
    }
  }

  console.log(`[sendDailyBriefing] 완료 (${date}): ${sent}명 성공, ${failed}명 실패${isPreview ? " [미리보기]" : ""}`);
  return { sent, failed, skipped: false };
}
