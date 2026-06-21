-- Project Bluebird 데이터베이스 스키마
-- 이 스크립트를 Supabase SQL Editor에서 실행하세요

-- 1. logs 테이블: 사용자의 트리거와 자동 사고 기록
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trigger TEXT NOT NULL,
  thought TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. analysis 테이블: AI 분석 결과 (인지 왜곡 탐지)
CREATE TABLE IF NOT EXISTS analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
  distortion_type TEXT NOT NULL CHECK (
    distortion_type IN (
      'catastrophizing',
      'all_or_nothing',
      'emotional_reasoning',
      'personalization',
      'arbitrary_inference'
    )
  ),
  intensity FLOAT NOT NULL CHECK (intensity >= 0 AND intensity <= 1),
  logic_error_segment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. intervention 테이블: 소크라테스식 질문 및 사용자 행동
CREATE TABLE IF NOT EXISTS intervention (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID NOT NULL REFERENCES logs(id) ON DELETE CASCADE,
  socratic_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  user_answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  final_action TEXT,
  is_completed BOOLEAN DEFAULT FALSE,
  autonomy_score INTEGER CHECK (autonomy_score >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analysis_log_id ON analysis(log_id);
CREATE INDEX IF NOT EXISTS idx_intervention_log_id ON intervention(log_id);
CREATE INDEX IF NOT EXISTS idx_intervention_completed ON intervention(is_completed);

-- Row Level Security (RLS) 정책 활성화
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE intervention ENABLE ROW LEVEL SECURITY;

-- RLS 정책: logs 테이블
-- 사용자는 본인의 로그만 조회 가능
CREATE POLICY "Users can view own logs" ON logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자는 본인의 로그만 생성 가능
CREATE POLICY "Users can create own logs" ON logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자는 본인의 로그만 수정 가능
CREATE POLICY "Users can update own logs" ON logs
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 사용자는 본인의 로그만 삭제 가능
CREATE POLICY "Users can delete own logs" ON logs
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS 정책: analysis 테이블
-- 사용자는 본인 로그의 분석 결과만 조회 가능
CREATE POLICY "Users can view own analysis" ON analysis
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM logs
      WHERE logs.id = analysis.log_id
      AND logs.user_id = auth.uid()
    )
  );

-- 인증된 사용자는 분석 결과 생성 가능 (API에서 호출)
CREATE POLICY "Authenticated users can create analysis" ON analysis
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM logs
      WHERE logs.id = analysis.log_id
      AND logs.user_id = auth.uid()
    )
  );

-- RLS 정책: intervention 테이블
-- 사용자는 본인 로그의 개입 데이터만 조회 가능
CREATE POLICY "Users can view own interventions" ON intervention
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM logs
      WHERE logs.id = intervention.log_id
      AND logs.user_id = auth.uid()
    )
  );

-- 인증된 사용자는 개입 데이터 생성 가능
CREATE POLICY "Authenticated users can create interventions" ON intervention
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM logs
      WHERE logs.id = intervention.log_id
      AND logs.user_id = auth.uid()
    )
  );

-- 사용자는 본인의 개입 데이터 수정 가능
CREATE POLICY "Users can update own interventions" ON intervention
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM logs
      WHERE logs.id = intervention.log_id
      AND logs.user_id = auth.uid()
    )
  );

-- updated_at 자동 업데이트 트리거 함수
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- logs 테이블에 updated_at 트리거 적용
CREATE TRIGGER update_logs_updated_at
  BEFORE UPDATE ON logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 완료 시간 자동 기록 트리거
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed = TRUE AND OLD.is_completed = FALSE THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_intervention_completed_at
  BEFORE UPDATE ON intervention
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_at();

-- 완료: 스키마 생성 성공
-- 다음: Supabase 대시보드에서 프로젝트 URL과 anon key를 복사하여 .env.local에 입력하세요
