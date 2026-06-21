-- 12_schema_drift_fixes.sql
-- P0-2·P0-3: 코드 참조와 스키마 정합화.
--
-- 항목:
--   1. logs.log_type — 코드 참조 있으나 컬럼 정의 없음. 'normal'|'success' enum CHECK.
--      (app/api/success-log/route.ts, app/journal/page.tsx, app/dashboard/page.tsx,
--       app/log/success/page.tsx, types/index.ts)
--   2. analysis.distortion_type — 01_initial_schema 에서 NOT NULL이지만
--      app/api/analyze/route.ts:265 가 distortion=0건 스트릭 마커로 NULL INSERT.
--      NOT NULL 제거하고 enum CHECK는 NULL 허용으로 완화.
--   3. analysis 테이블 DELETE 정책 누락 — app/api/analyze/route.ts:256 가
--      .from('analysis').delete().eq('log_id', logId) 호출. 본인 로그의 분석만 삭제 가능.
--   4. intervention 테이블 DELETE 정책은 *의도적 누락* — 코드에서 DELETE 호출 없음.
--      ON DELETE CASCADE (logs)로만 정리. 본 마이그레이션은 정책 추가 없음 (주석으로 명시).
--   5. intervention.completion_note, completion_reaction — app/api/action/route.ts 에서
--      INSERT/UPDATE 되지만 컬럼 정의 없음. 04_logs_pain_score 와 동일한 schema drift fix.
--
-- 모두 IF NOT EXISTS / DROP POLICY IF EXISTS / DO $$ 가드로 idempotent.

-- ============================================================
-- 1. logs.log_type
-- ============================================================
ALTER TABLE logs
  ADD COLUMN IF NOT EXISTS log_type TEXT
    CHECK (log_type IS NULL OR log_type IN ('normal', 'success'));

-- 'success' 로그 조회 가속 (journal/dashboard 분리 쿼리에서 자주 사용)
CREATE INDEX IF NOT EXISTS idx_logs_user_log_type
  ON logs (user_id, log_type)
  WHERE log_type IS NOT NULL;

-- ============================================================
-- 2. analysis.distortion_type NOT NULL 제거
-- ============================================================
-- 01_initial_schema 에서는 NOT NULL + enum CHECK 였으나
-- analyze route 가 "0건 스트릭 마커"로 NULL INSERT 함. 코드 수정 대신
-- 스키마 완화 (NULL 허용). enum 값 제약은 유지 (NULL 또는 5종 enum 중 하나).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'analysis'
      AND column_name = 'distortion_type'
      AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE analysis ALTER COLUMN distortion_type DROP NOT NULL;
  END IF;
END $$;

-- 기존 CHECK 제약(distortion_type IN (...))은 NULL을 허용하므로 그대로 둔다.
-- (PostgreSQL: CHECK (col IN (...)) 는 col IS NULL 일 때 PASS — UNKNOWN→TRUE)

-- ============================================================
-- 3. analysis DELETE 정책 추가
-- ============================================================
-- app/api/analyze/route.ts:256 — 재분석 시 기존 row 삭제 후 재삽입.
-- 정책 누락 시 RLS가 차단해 재분석 실패. 본인 log의 analysis만 삭제 허용.
DROP POLICY IF EXISTS "Users can delete own analysis" ON analysis;
CREATE POLICY "Users can delete own analysis" ON analysis
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM logs
      WHERE logs.id = analysis.log_id
        AND logs.user_id = auth.uid()
    )
  );

-- intervention 테이블 DELETE 정책은 의도적 미추가 — 코드 grep 결과 DELETE 호출 0건.
-- ON DELETE CASCADE (logs → intervention)로만 정리. 변경 시 본 마이그레이션과 함께 검토.

-- ============================================================
-- 5. intervention.completion_note / completion_reaction
-- ============================================================
-- app/api/action/route.ts 에서 INSERT/UPDATE 하지만 컬럼 정의 없음.
-- 04_logs_pain_score 와 동일한 schema drift fix.
ALTER TABLE intervention
  ADD COLUMN IF NOT EXISTS completion_note TEXT
    CHECK (completion_note IS NULL OR LENGTH(completion_note) <= 200),
  ADD COLUMN IF NOT EXISTS completion_reaction TEXT
    CHECK (
      completion_reaction IS NULL
      OR completion_reaction IN ('improved', 'same', 'worse')
    );

-- 끝.
