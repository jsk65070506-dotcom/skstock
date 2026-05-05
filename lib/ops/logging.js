// lib/ops/logging.js
// Cron 실행 이력 & 이메일 발송 로그 헬퍼

// ⚠️ 이 파일은 서버(API route / Cron)에서만 실행된다.
// brief_runs · email_logs 는 RLS가 켜져 있으므로 반드시 admin client를 사용한다.
import { supabaseAdmin as supabase } from "../supabaseAdmin";

/** KST 기준 오늘 날짜 문자열 반환 (YYYY-MM-DD) */
export function getKstDateString() {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" })
  )
    .toISOString()
    .slice(0, 10);
}

// ── brief_runs ────────────────────────────────────────────────────

/**
 * 새 실행 row 삽입. 같은 batch+run_date 가 이미 있으면 null 반환 (중복 방지).
 * @returns {string|null} 생성된 run id, 또는 null(중복)
 */
export async function createBriefRun(batch, runDate) {
  const { data, error } = await supabase
    .from("brief_runs")
    .insert({ batch, run_date: runDate, status: "running" })
    .select("id")
    .single();

  if (error) {
    // unique 제약 위반 → 이미 실행됨
    if (error.code === "23505") return null;
    throw new Error(`[logging] createBriefRun 실패: ${error.message}`);
  }
  return data.id;
}

/**
 * 실행 완료 기록
 */
export async function completeBriefRun(runId, { marketsOk, marketsFailed }) {
  const { error } = await supabase
    .from("brief_runs")
    .update({
      status: "done",
      markets_ok: marketsOk,
      markets_failed: marketsFailed,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) console.error(`[logging] completeBriefRun 실패: ${error.message}`);
}

/**
 * 실행 실패 기록
 */
export async function failBriefRun(runId) {
  const { error } = await supabase
    .from("brief_runs")
    .update({ status: "failed", finished_at: new Date().toISOString() })
    .eq("id", runId);

  if (error) console.error(`[logging] failBriefRun 실패: ${error.message}`);
}

// ── email_logs ────────────────────────────────────────────────────

/**
 * 이메일 발송 결과 기록
 * @param {object} opts
 * @param {'welcome'|'brief'} opts.emailType
 * @param {string}  opts.recipientEmail
 * @param {string}  [opts.market]       brief 이메일일 때 시장 키
 * @param {string}  [opts.runDate]      brief 이메일일 때 날짜 (YYYY-MM-DD)
 * @param {'sent'|'failed'} opts.status
 * @param {string}  [opts.errorMessage]
 */
export async function logEmail({ emailType, recipientEmail, market, runDate, status, errorMessage }) {
  const { error } = await supabase.from("email_logs").insert({
    email_type: emailType,
    recipient_email: recipientEmail,
    market: market || null,
    run_date: runDate || null,
    status,
    error_message: errorMessage || null,
  });

  if (error) console.error(`[logging] logEmail 실패: ${error.message}`);
}
