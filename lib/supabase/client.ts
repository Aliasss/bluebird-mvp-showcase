import { createBrowserClient } from '@supabase/ssr';

// Supabase 클라이언트 초기화 (클라이언트 사이드)
export const createClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase 환경 변수가 설정되지 않았습니다. .env.local 파일을 확인해주세요.');
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// 기본 클라이언트 인스턴스
export const supabase = createClient();
