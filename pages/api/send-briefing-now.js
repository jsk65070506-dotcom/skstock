// pages/api/send-briefing-now.js
// 오늘 실제 브리핑 데이터로 구독자에게 즉시 발송 (관리자 전용)
import { sendDailyBriefing } from "../../lib/sendDailyBriefing";
import { getLatestBriefing } from "../../lib/getLatestBriefing";

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // 간단 보안: bypass 파라미터
  if (req.query.bypass !== "skrun2026") {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 오늘 데이터 확인
    const briefing = await getLatestBriefing();
    if (!briefing) {
      return res.status(404).json({ error: "오늘 브리핑 데이터 없음 — 배치가 아직 실행 안 됐을 수 있어요" });
    }

    // 구독자에게 발송 (응답 전에 await)
    const result = await sendDailyBriefing();

    return res.status(200).json({
      ok: true,
      date: briefing.date,
      hasSummary: {
        us: !!briefing.us,
        kr: !!briefing.kr,
        crypto: !!briefing.crypto,
        realestate: !!briefing.realestate,
      },
      ...result,
    });
  } catch (e) {
    console.error("[send-briefing-now] 오류:", e?.message);
    return res.status(500).json({ error: e?.message || "서버 오류" });
  }
}
