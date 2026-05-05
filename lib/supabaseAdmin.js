// lib/supabaseAdmin.js
// 서버 전용 Supabase admin client — SUPABASE_SERVICE_ROLE_KEY 사용
// ⚠️  절대 클라이언트(브라우저) 컴포넌트에서 import 하지 말 것
// ⚠️  NEXT_PUBLIC_ 접두사가 없으므로 브라우저에 노출되지 않음

import { createClient } from "@supabase/supabase-js";

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다");
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다");
}

/**
 * Service-role client — RLS를 우회하며 서버 API route에서만 사용한다.
 * 이 client로 접근하는 테이블은 RLS를 켜고 public 정책을 만들지 않아도 된다.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // 서버에서만 사용하므로 세션 자동 갱신·영속화 불필요
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
