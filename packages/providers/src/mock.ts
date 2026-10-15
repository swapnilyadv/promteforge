import { collect } from './http.js';
import type { GenerateRequest, MockConfig, Provider } from './types.js';

/** Deterministic provider for tests and offline demos. */
export function createMock(cfg: MockConfig): Provider {
  const size = cfg.chunkSize ?? 12;
  async function* stream(req: GenerateRequest): AsyncIterable<string> {
    const text = typeof cfg.reply === 'function' ? cfg.reply(req) : cfg.reply;
    for (let i = 0; i < text.length; i += size) {
      if (req.signal?.aborted) return;
      yield text.slice(i, i + size);
    }
  }
  return {
    id: 'mock',
    isLocal: cfg.isLocal ?? true,
    model: 'mock',
    stream,
    generate: (req) => collect(stream(req)),
  };
}
