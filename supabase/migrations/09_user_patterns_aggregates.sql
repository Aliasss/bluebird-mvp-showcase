-- 09_user_patterns_aggregates.sql
-- 데이터 스키마 + 통계 데이터 수집(미노출).
-- 도입: 2026-04-30.
--
-- 본 마이그레이션은 *데이터 스키마 + 통계 함수 정의*만 포함한다.
-- 사용자 노출 X — UI/API 0건. 통계 노출은 별도 트랙으로 진행(추후 게이트 통과 후).
--
-- 보안 제약:
--   - RLS: 사용자는 자신의 row만 SELECT/INSERT (logs와 동일 패턴)
--   - user_aggregates_daily: SELECT 자기 row만, INSERT/UPDATE는 service_role만
--   - compute_pattern_stats(): authenticated/anon EXECUTE 금지, service_role만 EXECUTE
--   - anon_user_hash: 통계 집계용 익명화. user_id 직접 노출 회피.
--
-- IF NOT EXISTS 가이드: 멱등 적용. 이미 존재하는 객체에 대해 no-op.

-- ============================================================
-- pgcrypto 확장 (Supabase 기본 활성이지만 안전하게 보장)
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- AC1: user_patterns 테이블 (분석 결과 누적)
-- ============================================================
-- logs.id 와는 별도로, 분석된 distortion 1건당 1 row.
-- pain_score_delta는 follow-up checkin 등이 있을 때만 채워지며 NULL 허용.
-- trigger_category 는 logs.trigger_category snapshot (분석 시점).
CREATE TABLE IF NOT EXISTS user_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_id UUID REFERENCES logs(id) ON DELETE CASCADE,
  distortion_type TEXT NOT NULL,
  trigger_category TEXT,
  pain_score_delta INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_patterns_user_id
  ON user_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_user_patterns_distortion
  ON user_patterns(distortion_type);
CREATE INDEX IF NOT EXISTS idx_user_patterns_created_at
  ON user_patterns(created_at);

-- ============================================================
-- AC3: 익명화 hash (user_id sha256)
-- 본 컬럼은 *통계 집계 전용*. UI 노출 0건. join 키로도 사용 X.
-- GENERATED ALWAYS … STORED 로 정합성 자동 보장.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_patterns' AND column_name = 'anon_user_hash'
  ) THEN
    ALTER TABLE user_patterns
      ADD COLUMN anon_user_hash TEXT
      GENERATED ALWAYS AS (encode(digest(user_id::text, 'sha256'), 'hex')) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_user_patterns_anon_hash
  ON user_patterns(anon_user_hash);

-- ============================================================
-- AC2: user_aggregates_daily 테이블 (시계열 누적)
-- 일자별 1 row per user. 집계 작업(서비스 롤)이 batch update.
-- distortion_count_jsonb: { catastrophizing: 3, all_or_nothing: 1, ... }
-- trigger_count_jsonb: { work: 2, relationship: 1, ... }
-- pain_delta_avg: NUMERIC, NULL 허용 (delta 측정 X일 수 있음)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_aggregates_daily (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  distortion_count_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  trigger_count_jsonb JSONB NOT NULL DEFAULT '{}'::jsonb,
  pain_delta_avg NUMERIC,
  total_logs INT DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_user_aggregates_daily_date
  ON user_aggregates_daily(date);

-- ============================================================
-- AC4: RLS 정책 (절대 약화 금지)
-- ============================================================

-- user_patterns: 본인 SELECT/INSERT만 허용
ALTER TABLE user_patterns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_patterns_select_own ON user_patterns;
CREATE POLICY user_patterns_select_own ON user_patterns
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS user_patterns_insert_own ON user_patterns;
CREATE POLICY user_patterns_insert_own ON user_patterns
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 의도적으로 UPDATE/DELETE 정책 없음.
--   - UPDATE: 분석 결과 누적은 append-only. 변경 0.
--   - DELETE: ON DELETE CASCADE (logs/auth.users)로만 정리.
--   - service_role은 RLS bypass이므로 운영 정리 가능.

-- user_aggregates_daily: 본인 SELECT만 허용. INSERT/UPDATE는 service_role 전용.
ALTER TABLE user_aggregates_daily ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_aggregates_select_own ON user_aggregates_daily;
CREATE POLICY user_aggregates_select_own ON user_aggregates_daily
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- INSERT/UPDATE 정책 *없음* — authenticated/anon 차단.
-- 집계 작업은 service_role(RLS bypass)로만 수행.

-- ============================================================
-- AC7: 표본 크기 가드 함수 (N≥50)
-- 사용자 노출 X — service_role만 EXECUTE. 통계 노출은 추후 별도 게이트 통과 후.
-- SECURITY DEFINER + revoke PUBLIC/anon → 안전.
-- STABLE: 같은 인자에 대해 같은 결과(통계 스냅샷)
-- ============================================================
CREATE OR REPLACE FUNCTION compute_pattern_stats(min_n INT DEFAULT 50)
RETURNS TABLE(
  distortion_type TEXT,
  n BIGINT,
  pct NUMERIC,
  is_sample_sufficient BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH counts AS (
    SELECT user_patterns.distortion_type, COUNT(*) AS n
    FROM user_patterns
    GROUP BY user_patterns.distortion_type
  ),
  total AS (
    SELECT COUNT(*) AS total_n FROM user_patterns
  )
  SELECT
    c.distortion_type,
    c.n,
    ROUND(c.n::numeric / NULLIF(t.total_n, 0) * 100, 1) AS pct,
    (c.n >= min_n) AS is_sample_sufficient
  FROM counts c, total t;
$$;

REVOKE EXECUTE ON FUNCTION compute_pattern_stats(INT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION compute_pattern_stats(INT) FROM anon;
REVOKE EXECUTE ON FUNCTION compute_pattern_stats(INT) FROM authenticated;
GRANT  EXECUTE ON FUNCTION compute_pattern_stats(INT) TO service_role;

-- ============================================================
-- AC8: cognitive_role enum (T0 폼 응답 사전 정의)
-- 본 마이그레이션은 enum 정의*만*. T0 폼 자체 구현은 별도 트랙(베타 모집 인프라).
-- 1차 타겟 정의 정정(commit 64ad52f) 정합 — 직무 narrowing 식별자 도입 0건.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'cognitive_role'
  ) THEN
    CREATE TYPE cognitive_role AS ENUM (
      'analytical',
      'creative',
      'managerial',
      'service',
      'student',
      'other'
    );
  END IF;
END $$;

-- ============================================================
-- AC9: 사용자 노출 X 정책 — UI 0건 (런타임 검증)
-- compute_pattern_stats: PUBLIC·anon·authenticated 모두 EXECUTE 거부. service_role 전용.
-- 사용자 facing API endpoint: 0건 (코드베이스 grep 검증 별도).
-- 통계 노출은 추후 게이트 통과 + 자발 언급 지표 트리거 후.
-- ============================================================

-- 끝.
