import { collect, idleTimeout, postJson, readLines, safeJson } from './http.js';
import { ProviderError, type GenerateRequest, type OllamaConfig, type Provider } from './types.js';

export const OLLAMA_DEFAULT_URL = 'http://localhost:11434';
export const OLLAMA_DEFAULT_MODEL = 'llama3.1:8b';

interface OllamaChunk {
  message?: { content?: string };
  done?: boolean;
  error?: string;
}

export function createOllama(cfg: OllamaConfig): Provider {
  const baseUrl = (cfg.baseUrl ?? OLLAMA_DEFAULT_URL).replace(/\/$/, '');
  const fetchImpl = cfg.fetch ?? globalThis.fetch.bind(globalThis);
  const model = cfg.model ?? OLLAMA_DEFAULT_MODEL;
  const timeoutMs = cfg.timeoutMs ?? 120_000;

  async function* stream(req: GenerateRequest): AsyncIterable<string> {
    const timer = idleTimeout(req.signal, timeoutMs);
    try {
      const res = await postJson(
        'ollama',
        fetchImpl,
        `${baseUrl}/api/chat`,
        {
          model: req.model ?? model,
          messages: req.messages,
          stream: true,
          keep_alive: cfg.keepAlive ?? '15m',
          options: {
            temperature: req.temperature ?? 0.3,
            ...(req.maxTokens ? { num_predict: req.maxTokens } : {}),
          },
        },
        {},
        timer.signal,
      );
      for await (const line of readLines(res.body!, timer.touch)) {
        if (!line.trim()) continue;
        const chunk = safeJson<OllamaChunk>(line);
        if (!chunk) continue;
        if (chunk.error) throw new ProviderError(`ollama: ${chunk.error}`, 'ollama');
        const text = chunk.message?.content;
        if (text) yield text;
        if (chunk.done) return;
      }
    } finally {
      timer.clear();
    }
  }

  return {
    id: 'ollama',
    isLocal: true,
    model,
    stream,
    generate: (req) => collect(stream(req)),
  };
}

/** Lists installed Ollama models; returns [] when Ollama isn't running. */
export async function listOllamaModels(
  baseUrl = OLLAMA_DEFAULT_URL,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<string[]> {
  try {
    const res = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { models?: { name: string }[] };
    return (json.models ?? []).map((m) => m.name);
  } catch {
    return [];
  }
}
