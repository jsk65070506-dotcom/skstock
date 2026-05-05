-- 001_add_operational_logs.sql
-- Cron 실행 로그 및 이메일 발송 로그 테이블

-- brief_runs: 배치 실행 단위 로그 (중복 실행 방지 + 이력 관리)
CREATE TABLE IF NOT EXISTS brief_runs (
  id             BIGSERIAL PRIMARY KEY,
  batch          TEXT        NOT NULL,          -- 'a' | 'b' | 'all'
  run_date       DATE        NOT NULL,          -- KST 기준 날짜 (2026-05-04)
  status         TEXT        NOT NULL DEFAULT 'running',  -- 'running' | 'done' | 'failed'
  markets_ok     INT         NOT NULL DEFAULT 0,
  markets_failed INT         NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ
);

-- 같은 batch + 날짜 조합은 하루 1회만 (중복 실행 방지)
CREATE UNIQUE INDEX IF NOT EXISTS brief_runs_batch_date_uidx
  ON brief_runs (batch, run_date);

-- email_logs: 이메일 발송 결과 기록
CREATE TABLE IF NOT EXISTS email_logs (
  id              BIGSERIAL PRIMARY KEY,
  email_type      TEXT        NOT NULL,  -- 'welcome' | 'brief'
  recipient_email TEXT        NOT NULL,
  market          TEXT,                  -- brief 이메일인 경우 시장 키 (us/kr/crypto/realty)
  run_date        DATE,                  -- brief 이메일인 경우 해당 날짜
  status          TEXT        NOT NULL,  -- 'sent' | 'failed'
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 조회 성능을 위한 인덱스
CREATE INDEX IF NOT EXISTS email_logs_run_date_idx ON email_logs (run_date);
CREATE INDEX IF NOT EXISTS email_logs_email_type_idx ON email_logs (email_type);
