import { describe, expect, it } from 'vitest';
import { createProvider, ProviderError } from '../src/index.js';

/** A fetch stub that streams `body` back in small byte chunks and records the request. */
function fakeFetch(body: string, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string | URL, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    const bytes = new TextEncoder().encode(body);
    const stream = new ReadableStream<Uint8Array>({
      start(ctrl) {
        for (let i = 0; i < bytes.length; i += 7) ctrl.enqueue(bytes.slice(i, i + 7));
        ctrl.close();
      },
    });
    return new Response(stream, { status, statusText: status === 200 ? 'OK' : 'Bad' });
  }) as unknown as typeof fetch;
  return { impl, calls };
}

/**
 * A fetch stub that sends each chunk after `gapMs`, then goes silent (connection left open)
 * once `stallAfter` chunks are out. Honours the abort signal like real fetch.
 */
function slowFetch(chunks: string[], gapMs: number, stallAfter = Infinity) {
  return (async (_url: string | URL, init?: RequestInit) => {
    const signal = init?.signal;
    const stream = new ReadableStream<Uint8Array>({
      async start(ctrl) {
        signal?.addEventListener('abort', () => ctrl.error(signal.reason), { once: true });
        for (let i = 0; i < chunks.length; i++) {
          if (i >= stallAfter) return;
          await new Promise((r) => setTimeout(r, gapMs));
          if (signal?.aborted) return;
          ctrl.enqueue(new TextEncoder().encode(chunks[i]));
        }
        ctrl.close();
      },
    });
    return new Response(stream);
  }) as unknown as typeof fetch;
}

const msgs = [
  { role: 'system' as const, content: 'You are a prompt engineer.' },
  { role: 'user' as const, content: 'hi' },
];

describe('timeouts', () => {
  const chunks = ['{"message":{"content":"a"}}\n', '{"message":{"content":"b"}}\n', '{"message":{"content":"c"},"done":true}\n'];

  it('lets a slow but steady stream finish past the timeout', async () => {
    // 3 chunks × 40 ms = 120 ms total, but never 60 ms without data.
    const p = createProvider({ type: 'ollama', fetch: slowFetch(chunks, 40), timeoutMs: 60 });
    expect(await p.generate({ messages: msgs })).toBe('abc');
  });

  it('aborts a stream that stalls', async () => {
    const p = createProvider({ type: 'ollama', fetch: slowFetch(chunks, 10, 1), timeoutMs: 60 });
    await expect(p.generate({ messages: msgs })).rejects.toThrow(/no data for 0.06s/);
  });
});

describe('ollama', () => {
  it('streams NDJSON chat chunks', async () => {
    const { impl, calls } = fakeFetch(
      [
        '{"message":{"content":"Hel"},"done":false}',
        '{"message":{"content":"lo"},"done":false}',
        '{"message":{"content":""},"done":true}',
        '',
      ].join('\n'),
    );
    const p = createProvider({ type: 'ollama', fetch: impl, model: 'qwen2.5:7b' });
    expect(p.isLocal).toBe(true);
    expect(await p.generate({ messages: msgs })).toBe('Hello');
    expect(calls[0]!.url).toBe('http://localhost:11434/api/chat');
    expect(JSON.parse(String(calls[0]!.init.body)).model).toBe('qwen2.5:7b');
    expect(JSON.parse(String(calls[0]!.init.body)).keep_alive).toBe('15m');
    // A rich prompt plus its answer does not fit Ollama's 4096 default; it would silently drop the instructions.
    expect(JSON.parse(String(calls[0]!.init.body)).options.num_ctx).toBe(8192);
  });
});

describe('openai-compatible', () => {
  const sse = [
    'data: {"choices":[{"delta":{"role":"assistant"}}]}',
    '',
    'data: {"choices":[{"delta":{"content":"Pro"}}]}',
    '',
    'data: {"choices":[{"delta":{"content":"mpt"}}]}',
    '',
    'data: [DONE]',
    '',
  ].join('\n');

  it('streams OpenAI SSE and sends bearer auth', async () => {
    const { impl, calls } = fakeFetch(sse);
    const p = createProvider({ type: 'openai', apiKey: 'sk-test', fetch: impl });
    expect(await p.generate({ messages: msgs })).toBe('Prompt');
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers.authorization).toBe('Bearer sk-test');
    expect(calls[0]!.url).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('openrouter adds attribution headers; lmstudio needs no key', async () => {
    const a = fakeFetch(sse);
    await createProvider({ type: 'openrouter', apiKey: 'k', fetch: a.impl }).generate({ messages: msgs });
    expect((a.calls[0]!.init.headers as Record<string, string>)['X-Title']).toBe('PromptForge');

    const b = fakeFetch(sse);
    const lm = createProvider({ type: 'lmstudio', fetch: b.impl });
    expect(lm.isLocal).toBe(true);
    expect(await lm.generate({ messages: msgs })).toBe('Prompt');
  });

  it('requires a key for cloud providers', () => {
    expect(() => createProvider({ type: 'openai' })).toThrow(ProviderError);
  });

  it('surfaces HTTP errors as ProviderError with status', async () => {
    const { impl } = fakeFetch('{"error":"bad key"}', 401);
    const p = createProvider({ type: 'openai', apiKey: 'x', fetch: impl });
    await expect(p.generate({ messages: msgs })).rejects.toMatchObject({ status: 401 });
  });
});

describe('anthropic', () => {
  it('lifts system prompt and streams text deltas', async () => {
    const { impl, calls } = fakeFetch(
      [
        'event: message_start',
        'data: {"type":"message_start"}',
        '',
        'event: content_block_delta',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"<task>"}}',
        '',
        'event: content_block_delta',
        'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"x</task>"}}',
        '',
        'event: message_stop',
        'data: {"type":"message_stop"}',
        '',
      ].join('\n'),
    );
    const p = createProvider({ type: 'anthropic', apiKey: 'k', fetch: impl, browser: true });
    expect(await p.generate({ messages: msgs })).toBe('<task>x</task>');
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body.system).toBe('You are a prompt engineer.');
    expect(body.messages).toEqual([{ role: 'user', content: 'hi' }]);
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
  });

  it('sends no sampling params and leaves room for thinking', async () => {
    const { impl, calls } = fakeFetch('data: {"type":"message_stop"}\n\n');
    await createProvider({ type: 'anthropic', apiKey: 'k', fetch: impl }).generate({
      messages: msgs,
      temperature: 0,
      maxTokens: 200,
    });
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body).not.toHaveProperty('temperature');
    expect(body.max_tokens).toBeGreaterThan(200);
  });

  it('turns a refusal into an error instead of an empty answer', async () => {
    const { impl } = fakeFetch(
      'data: {"type":"message_delta","delta":{"stop_reason":"refusal"}}\n\ndata: {"type":"message_stop"}\n\n',
    );
    const p = createProvider({ type: 'anthropic', apiKey: 'k', fetch: impl });
    await expect(p.generate({ messages: msgs })).rejects.toThrow(/refusal/);
  });
});

describe('gemini', () => {
  it('maps roles and streams candidate parts', async () => {
    const { impl, calls } = fakeFetch(
      [
        'data: {"candidates":[{"content":{"parts":[{"text":"Task: "}]}}]}',
        '',
        'data: {"candidates":[{"content":{"parts":[{"text":"write"}]}}]}',
        '',
      ].join('\n'),
    );
    const p = createProvider({ type: 'gemini', apiKey: 'g', fetch: impl });
    expect(await p.generate({ messages: msgs })).toBe('Task: write');
    expect(calls[0]!.url).toContain(':streamGenerateContent?alt=sse');
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body.systemInstruction.parts[0].text).toBe('You are a prompt engineer.');
    expect(body.contents[0].role).toBe('user');
  });
});

describe('mock', () => {
  it('streams in chunks', async () => {
    const p = createProvider({ type: 'mock', reply: 'abcdefghijklmnop', chunkSize: 5 });
    const chunks: string[] = [];
    for await (const c of p.stream({ messages: msgs })) chunks.push(c);
    expect(chunks).toEqual(['abcde', 'fghij', 'klmno', 'p']);
  });
});
