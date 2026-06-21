-- 17_evangelist_applications.sql
-- 에반젤리스트(공동 설계자) 응모 데이터 저장 — 2026-05-17.
-- 사용자 결정: 별도 외부 폼(Tally·Google Form) 대신 BlueBird MVP /me 페이지에 직접 통합.
--
-- 변경 사항 (당시 외부 폼 가정):
--   - 인터뷰 메커니즘 → 서면 리포트로 전환 (운영자 결정)
--   - 연령대(age_band) 필드 신규 추가
--   - 응모자는 가입 사용자만 (RLS: auth.uid() = user_id)
--
-- 정합:
--   - logs/checkins/push_subscriptions와 동일 RLS 패턴
--   - 본인 row만 INSERT/SELECT 가능. UPDATE/DELETE는 service_role만 (운영 정정용)
--   - PIPA 정합: 직무·소속·연봉·진단명 수집 X.

CREATE TABLE IF NOT EXISTS evangelist_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Q1~Q5 자유 응답
  q1_handling     TEXT NOT NULL,           -- 마음에 걸리는 일을 다루는 방식
  q2_self_tool    TEXT NOT NULL,           -- 본인을 알아가는 도구·방법
  q3_thinking     TEXT NOT NULL,           -- 평일 생각 사용 시간·맥락
  q4_apps         TEXT,                    -- 사고·감정·일상 다루는 앱 경험 (선택)
  q5_recurring    TEXT,                    -- 최근 2주 자주 떠올린 어려움 (선택, 4 확장 카테고리 측정)
  -- 연령대 (2026-05-17 신규)
  age_band        TEXT NOT NULL CHECK (age_band IN (
    'under_20', '20s', '30s', '40s', '50s', '60_plus'
  )),
  -- 동의 (서면 리포트 메커니즘)
  consent_written_report  BOOLEAN NOT NULL,  -- 약 30분 분량 서면 리포트 작성 동의
  consent_data_analysis   BOOLEAN NOT NULL,  -- 응답·리포트 분석 동의 (분석 외 사용 X, 30일 후 raw 폐기)
  consent_contact         BOOLEAN NOT NULL,  -- 이메일 연락 동의
  -- 연락처
  contact_email   TEXT NOT NULL,           -- 답변용 이메일 (auth.users.email과 다를 수 있음)
  -- UTM 트래킹
  utm_source      TEXT,
  utm_medium      TEXT,
  utm_campaign    TEXT,
  utm_content     TEXT,
  utm_term        TEXT,
  -- 운영 상태
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',    -- 응모 접수, 검토 대기
    'selected',   -- 선발
    'rejected',   -- 미선발
    'withdrawn'   -- 응모자 본인 철회
  )),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 본인 1건 응모 유일 제약 (운영자가 status 변경하지 않는 한 재응모 차단)
CREATE UNIQUE INDEX IF NOT EXISTS idx_evangelist_applications_user_unique
  ON evangelist_applications(user_id)
  WHERE status != 'withdrawn';

-- 조회 가속
CREATE INDEX IF NOT EXISTS idx_evangelist_applications_status
  ON evangelist_applications(status, created_at DESC);

-- RLS — checkins/logs/push_subscriptions와 동일 패턴
ALTER TABLE evangelist_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS evangelist_applications_select_own ON evangelist_applications;
CREATE POLICY evangelist_applications_select_own ON evangelist_applications
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS evangelist_applications_insert_own ON evangelist_applications;
CREATE POLICY evangelist_applications_insert_own ON evangelist_applications
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: 본인은 status='withdrawn'만 가능 (응모 철회). 그 외 변경은 service_role.
DROP POLICY IF EXISTS evangelist_applications_withdraw_own ON evangelist_applications;
CREATE POLICY evangelist_applications_withdraw_own ON evangelist_applications
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND status = 'withdrawn');

-- DELETE 정책 없음 — ON DELETE CASCADE (auth.users) 또는 service_role 정리만.

-- updated_at 자동 갱신 trigger
CREATE OR REPLACE FUNCTION evangelist_applications_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evangelist_applications_updated_at ON evangelist_applications;
CREATE TRIGGER trg_evangelist_applications_updated_at
  BEFORE UPDATE ON evangelist_applications
  FOR EACH ROW
  EXECUTE FUNCTION evangelist_applications_set_updated_at();

-- 끝.
