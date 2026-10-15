export type ProviderId = 'ollama' | 'lmstudio' | 'openai' | 'openrouter' | 'anthropic' | 'gemini' | 'mock';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateRequest {
  messages: ChatMessage[];
  /** Overrides the provider's configured model for this call. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** One interface for every backend: stream tokens, or get the whole text. */
export interface Provider {
  readonly id: ProviderId;
  /** True when text never leaves the user's machine (Ollama, LM Studio). */
  readonly isLocal: boolean;
  readonly model: string;
  stream(req: GenerateRequest): AsyncIterable<string>;
  generate(req: GenerateRequest): Promise<string>;
}

export interface BaseConfig {
  model?: string;
  /** Custom fetch (tests, proxies, Tauri http plugin). Defaults to globalThis.fetch. */
  fetch?: typeof fetch;
  /**
   * Give up after this many ms with no data: no response yet, or a stalled stream.
   * Resets on every chunk, so a slow model that keeps streaming is never cut off.
   * Default 60 000; 120 000 for local models (Ollama, LM Studio).
   */
  timeoutMs?: number;
}

export interface OllamaConfig extends BaseConfig {
  type: 'ollama';
  baseUrl?: string;
}

export interface OpenAICompatibleConfig extends BaseConfig {
  type: 'openai' | 'openrouter' | 'lmstudio';
  apiKey?: string;
  baseUrl?: string;
  /** Extra headers, e.g. OpenRouter's HTTP-Referer / X-Title. */
  headers?: Record<string, string>;
}

export interface AnthropicConfig extends BaseConfig {
  type: 'anthropic';
  apiKey: string;
  baseUrl?: string;
  /** Needed when calling straight from a browser extension page. */
  browser?: boolean;
}

export interface GeminiConfig extends BaseConfig {
  type: 'gemini';
  apiKey: string;
  baseUrl?: string;
}

export interface MockConfig {
  type: 'mock';
  /** Fixed reply, or a function of the request. */
  reply: string | ((req: GenerateRequest) => string);
  isLocal?: boolean;
  /** Characters per streamed chunk. Default 12. */
  chunkSize?: number;
}

export type ProviderConfig =
  | OllamaConfig
  | OpenAICompatibleConfig
  | AnthropicConfig
  | GeminiConfig
  | MockConfig;

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly provider: ProviderId,
    readonly status?: number,
    readonly body?: string,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}
