import { createAnthropic } from './anthropic.js';
import { createGemini } from './gemini.js';
import { createMock } from './mock.js';
import { createOllama } from './ollama.js';
import { createOpenAICompatible } from './openai.js';
import type { Provider, ProviderConfig } from './types.js';

export * from './types.js';
export { createAnthropic, ANTHROPIC_DEFAULT_MODEL } from './anthropic.js';
export { createGemini, GEMINI_DEFAULT_MODEL } from './gemini.js';
export { createMock } from './mock.js';
export {
  createOllama,
  listOllamaModels,
  pickOllamaModel,
  OLLAMA_DEFAULT_MODEL,
  OLLAMA_DEFAULT_URL,
} from './ollama.js';
export { createOpenAICompatible } from './openai.js';
export { collect, readLines, readSSE } from './http.js';

/** Build any provider from a plain config object (what settings screens store). */
export function createProvider(cfg: ProviderConfig): Provider {
  switch (cfg.type) {
    case 'ollama':
      return createOllama(cfg);
    case 'openai':
    case 'openrouter':
    case 'lmstudio':
      return createOpenAICompatible(cfg);
    case 'anthropic':
      return createAnthropic(cfg);
    case 'gemini':
      return createGemini(cfg);
    case 'mock':
      return createMock(cfg);
  }
}
