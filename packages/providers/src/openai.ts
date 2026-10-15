import { collect, idleTimeout, postJson, readSSE, safeJson } from './http.js';
import {
  ProviderError,
  type GenerateRequest,
  type OpenAICompatibleConfig,
  type Provider,
} from './types.js';

const DEFAULTS = {
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', isLocal: false },
  openrouter: {
    baseUrl: 'https://openrouter.ai/api/v1',
    model: 'openai/gpt-4o-mini',
    isLocal: false,
  },
  lmstudio: { baseUrl: 'http://localhost:1234/v1', model: 'local-model', isLocal: true },
} as const;

interface ChatChunk {
  choices?: { delta?: { content?: string | null } }[];
  error?: { message?: string };
}

/** OpenAI Chat Completions API — also used for OpenRouter and LM Studio, which speak the same protocol. */
export function createOpenAICompatible(cfg: OpenAICompatibleConfig): Provider {
  const d = DEFAULTS[cfg.type];
  const baseUrl = (cfg.baseUrl ?? d.baseUrl).replace(/\/$/, '');
  const fetchImpl = cfg.fetch ?? globalThis.fetch.bind(globalThis);
  const model = cfg.model ?? d.model;
  // Local models can sit for a while on prompt processing before the first token.
  const timeoutMs = cfg.timeoutMs ?? (d.isLocal ? 120_000 : 60_000);

  if (!d.isLocal && !cfg.apiKey) {
    throw new ProviderError(`${cfg.type}: apiKey is required`, cfg.type);
  }

  const headers: Record<string, string> = { ...(cfg.headers ?? {}) };
  if (cfg.apiKey) headers.authorization = `Bearer ${cfg.apiKey}`;
  if (cfg.type === 'openrouter') {
    headers['HTTP-Referer'] ??= 'https://promptforge.app';
    headers['X-Title'] ??= 'PromptForge';
  }

  async function* stream(req: GenerateRequest): AsyncIterable<string> {
    const timer = idleTimeout(req.signal, timeoutMs);
    try {
      const res = await postJson(
        cfg.type,
        fetchImpl,
        `${baseUrl}/chat/completions`,
        {
          model: req.model ?? model,
          messages: req.messages,
          stream: true,
          temperature: req.temperature ?? 0.3,
          ...(req.maxTokens ? { max_tokens: req.maxTokens } : {}),
        },
        headers,
        timer.signal,
      );
      for await (const data of readSSE(res.body!, timer.touch)) {
        if (data.trim() === '[DONE]') return;
        const chunk = safeJson<ChatChunk>(data);
        if (!chunk) continue;
        if (chunk.error) throw new ProviderError(`${cfg.type}: ${chunk.error.message}`, cfg.type);
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) yield text;
      }
    } finally {
      timer.clear();
    }
  }

  return {
    id: cfg.type,
    isLocal: d.isLocal,
    model,
    stream,
    generate: (req) => collect(stream(req)),
  };
}
