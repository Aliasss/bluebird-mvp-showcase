// Vitest globals (describe, it, expect, vi) are enabled via config.
// 환경변수 기본값. 실제 Gemini 호출은 각 테스트에서 vi.mock으로 차단.
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY ?? 'test-gemini-key';
