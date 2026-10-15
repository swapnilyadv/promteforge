import { collect, idleTimeout, postJson, readSSE, safeJson } from './http.js';
import { ProviderError, type GeminiConfig, type GenerateRequest, type Provider } from './types.js';

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

interface GeminiChunk {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  error?: { message?: string };
}

/** Google Gemini API (generateContent, streamed as SSE). */
export function createGemini(cfg: GeminiConfig): Provider {
  if (!cfg.apiKey) throw new ProviderError('gemini: apiKey is required', 'gemini');
  const baseUrl = (cfg.baseUrl ?? 'https://generativelanguage.googleapis.com/v1beta').replace(
    /\/$/,
    '',
  );
  const fetchImpl = cfg.fetch ?? globalThis.fetch.bind(globalThis);
  const model = cfg.model ?? GEMINI_DEFAULT_MODEL;
  const timeoutMs = cfg.timeoutMs ?? 60_000;

  async function* stream(req: GenerateRequest): AsyncIterable<string> {
    const system = req.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const contents = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

    const timer = idleTimeout(req.signal, timeoutMs);
    try {
      const res = await postJson(
        'gemini',
        fetchImpl,
        `${baseUrl}/models/${encodeURIComponent(req.model ?? model)}:streamGenerateContent?alt=sse`,
        {
          ...(system ? { systemInstruction: { parts: [{ text: system }] } } : {}),
          contents,
          generationConfig: {
            temperature: req.temperature ?? 0.3,
            ...(req.maxTokens ? { maxOutputTokens: req.maxTokens } : {}),
          },
        },
        { 'x-goog-api-key': cfg.apiKey },
        timer.signal,
      );
      for await (const data of readSSE(res.body!, timer.touch)) {
        const chunk = safeJson<GeminiChunk>(data);
        if (!chunk) continue;
        if (chunk.error) throw new ProviderError(`gemini: ${chunk.error.message}`, 'gemini');
        const parts = chunk.candidates?.[0]?.content?.parts ?? [];
        for (const p of parts) if (p.text) yield p.text;
      }
    } finally {
      timer.clear();
    }
  }

  return {
    id: 'gemini',
    isLocal: false,
    model,
    stream,
    generate: (req) => collect(stream(req)),
  };
}
