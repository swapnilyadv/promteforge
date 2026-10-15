import { collect, idleTimeout, postJson, readSSE, safeJson } from './http.js';
import { ProviderError, type AnthropicConfig, type GenerateRequest, type Provider } from './types.js';

export const ANTHROPIC_DEFAULT_MODEL = 'claude-haiku-5-5';

interface AnthropicEvent {
  type?: string;
  delta?: { type?: string; text?: string };
  error?: { message?: string };
}

/** Anthropic Messages API. System messages are lifted into the top-level `system` field. */
export function createAnthropic(cfg: AnthropicConfig): Provider {
  if (!cfg.apiKey) throw new ProviderError('anthropic: apiKey is required', 'anthropic');
  const baseUrl = (cfg.baseUrl ?? 'https://api.anthropic.com').replace(/\/$/, '');
  const fetchImpl = cfg.fetch ?? globalThis.fetch.bind(globalThis);
  const model = cfg.model ?? ANTHROPIC_DEFAULT_MODEL;
  const timeoutMs = cfg.timeoutMs ?? 60_000;

  const headers: Record<string, string> = {
    'x-api-key': cfg.apiKey,
    'anthropic-version': '2023-06-01',
  };
  if (cfg.browser) headers['anthropic-dangerous-direct-browser-access'] = 'true';

  async function* stream(req: GenerateRequest): AsyncIterable<string> {
    const system = req.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n');
    const messages = req.messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }));

    const timer = idleTimeout(req.signal, timeoutMs);
    try {
      const res = await postJson(
        'anthropic',
        fetchImpl,
        `${baseUrl}/v1/messages`,
        {
          model: req.model ?? model,
          max_tokens: req.maxTokens ?? 2048,
          temperature: req.temperature ?? 0.3,
          ...(system ? { system } : {}),
          messages,
          stream: true,
        },
        headers,
        timer.signal,
      );
      for await (const data of readSSE(res.body!, timer.touch)) {
        const evt = safeJson<AnthropicEvent>(data);
        if (!evt) continue;
        if (evt.type === 'error') {
          throw new ProviderError(`anthropic: ${evt.error?.message ?? 'stream error'}`, 'anthropic');
        }
        if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta' && evt.delta.text) {
          yield evt.delta.text;
        }
        if (evt.type === 'message_stop') return;
      }
    } finally {
      timer.clear();
    }
  }

  return {
    id: 'anthropic',
    isLocal: false,
    model,
    stream,
    generate: (req) => collect(stream(req)),
  };
}
