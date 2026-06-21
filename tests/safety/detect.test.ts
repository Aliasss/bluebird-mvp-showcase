import { describe, it, expect, vi } from 'vitest';
import { detect } from '@/lib/safety/detect';
import type { LlmClient } from '@/lib/safety/llm-classifier';

function makeClient(response: string): LlmClient {
  return { generate: vi.fn().mockResolvedValue(response) };
}

describe('detect - keyword critical 즉시 반영', () => {
  it('"자살" 입력은 LLM 호출 없이 critical', async () => {
    const client = makeClient('이 응답은 사용되면 안 됨');
    const result = await detect({ trigger: '', thought: '자살 생각이 든다', client });
    expect(result.level).toBe('critical');
    expect(result.detectedBy).toBe('keyword');
    expect(client.generate).not.toHaveBeenCalled();
  });
});

describe('detect - keyword none 즉시 반영', () => {
  it('평온한 입력은 LLM 호출 없이 none', async () => {
    const client = makeClient('이 응답은 사용되면 안 됨');
    const result = await detect({ trigger: '회의 시작', thought: '긴장되지만 잘 준비했다', client });
    expect(result.level).toBe('none');
    expect(result.detectedBy).toBeNull();
    expect(client.generate).not.toHaveBeenCalled();
  });
});

describe('detect - suspected → LLM 재분류', () => {
  it('suspected 키워드는 LLM이 critical 판정 시 critical', async () => {
    const client = makeClient(JSON.stringify({ level: 'critical', reason: '절망 + 구체적 의도' }));
    const result = await detect({ trigger: '', thought: '다 끝내고 싶다', client });
    expect(result.level).toBe('critical');
    expect(result.detectedBy).toBe('llm');
    expect(client.generate).toHaveBeenCalledOnce();
  });

  it('suspected 키워드는 LLM이 none 판정 시 none', async () => {
    const client = makeClient(JSON.stringify({ level: 'none', reason: '학업 피로' }));
    const result = await detect({ trigger: '', thought: '공부 포기하고 싶다' , client });
    expect(result.level).toBe('none');
    expect(result.detectedBy).toBe('llm');
  });

  it('suspected 키워드는 LLM이 caution 판정 시 caution', async () => {
    const client = makeClient(JSON.stringify({ level: 'caution', reason: '강한 소진' }));
    const result = await detect({ trigger: '', thought: '너무 지쳤다', client });
    expect(result.level).toBe('caution');
    expect(result.detectedBy).toBe('llm');
  });

  it('LLM 에러 시 caution으로 fail-closed + detectedBy=llm_fallback', async () => {
    const client: LlmClient = { generate: vi.fn().mockRejectedValue(new Error('timeout')) };
    const result = await detect({ trigger: '', thought: '너무 지쳤다', client });
    expect(result.level).toBe('caution');
    expect(result.detectedBy).toBe('llm_fallback');
  });
});

describe('detect - trigger + thought 결합', () => {
  it('trigger에만 위험 표현이 있어도 감지', async () => {
    const client = makeClient('unused');
    const result = await detect({ trigger: '자해한 다음 날', thought: '괜찮을지 모르겠어', client });
    expect(result.level).toBe('critical');
    expect(result.detectedBy).toBe('keyword');
  });
});
