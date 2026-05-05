// lib/getLatestBriefing.js
import { supabaseAdmin } from "./supabaseAdmin";

/**
 * KST 기준 오늘 날짜 문자열 반환 ("YYYY-MM-DD")
 */
function getKstDateString() {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

/**
 * 오늘 (KST) market_briefings 데이터를 조회해 통합 브리핑 객체로 반환
 *
 * @returns {Promise<{
 *   date: string,
 *   us: string|null,
 *   kr: string|null,
 *   crypto: string|null,
 *   realestate: string|null,
 *   keywords: string[],
 *   dateSlug: string,
 * } | null>}
 */
export async function getLatestBriefing() {
  const date = getKstDateString();

  const { data: rows, error } = await supabaseAdmin
    .from("market_briefings")
    .select("market, one_line_summary, picks")
    .eq("date", date);

  if (error) {
    console.error("[getLatestBriefing] Supabase 오류:", error.message);
    return null;
  }

  if (!rows || rows.length === 0) {
    console.warn("[getLatestBriefing] 오늘 데이터 없음:", date);
    return null;
  }

  // market → one_line_summary 매핑
  const summaryMap = {};
  for (const row of rows) {
    summaryMap[row.market] = row.one_line_summary || null;
  }

  // picks에서 키워드 추출 (ticker 또는 name, 중복 제거, 최대 3개)
  const keywordSet = new Set();
  for (const row of rows) {
    const picks = Array.isArray(row.picks) ? row.picks : [];
    for (const pick of picks) {
      if (pick.ticker) keywordSet.add(pick.ticker);
      else if (pick.name) keywordSet.add(pick.name);
    }
  }
  const keywords = [...keywordSet].slice(0, 3);

  return {
    date,
    us:         summaryMap["us"]    || null,
    kr:         summaryMap["kr"]    || null,
    crypto:     summaryMap["crypto"]|| null,
    // DB에 "realty"로 저장되므로 양쪽 모두 확인
    realestate: summaryMap["realestate"] || summaryMap["realty"] || null,
    keywords,
    dateSlug: date.replace(/-/g, ""),
  };
}
