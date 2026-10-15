import { ProviderError, type ProviderId } from './types.js';

export interface IdleTimeout {
  signal: AbortSignal;
  /** Call whenever data arrives: restarts the countdown. */
  touch: () => void;
  /** Call when the request is finished (or abandoned). */
  clear: () => void;
}

/**
 * Combine a caller's AbortSignal with an idle timeout: abort only when nothing has arrived
 * for `idleMs` (no response yet, or a stalled stream). A slow model that keeps streaming
 * is never cut off — generation length is bounded by `maxTokens`, not by the clock.
 */
export function idleTimeout(signal: AbortSignal | undefined, idleMs: number): IdleTimeout {
  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort(signal?.reason);
  if (signal?.aborted) onAbort();
  else signal?.addEventListener('abort', onAbort, { once: true });
  let timer: ReturnType<typeof setTimeout> | undefined;
  const touch = () => {
    clearTimeout(timer);
    timer = setTimeout(() => ctrl.abort(new DOMException(`no data for ${idleMs / 1000}s`, 'TimeoutError')), idleMs);
  };
  touch();
  return {
    signal: ctrl.signal,
    touch,
    clear: () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

export async function postJson(
  provider: ProviderId,
  fetchImpl: typeof fetch,
  url: string,
  body: unknown,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new ProviderError(`${provider}: request failed (${msg})`, provider);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ProviderError(
      `${provider}: HTTP ${res.status} ${res.statusText} ${text.slice(0, 300)}`.trim(),
      provider,
      res.status,
      text,
    );
  }
  if (!res.body) throw new ProviderError(`${provider}: empty response body`, provider, res.status);
  return res;
}

/** Yields decoded text lines from a streamed body. `onData` runs on every received chunk. */
export async function* readLines(body: ReadableStream<Uint8Array>, onData?: () => void): AsyncIterable<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      onData?.();
      buffer += decoder.decode(value, { stream: true });
      let idx: number;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).replace(/\r$/, '');
        buffer = buffer.slice(idx + 1);
        yield line;
      }
    }
    buffer += decoder.decode();
    if (buffer.length) yield buffer.replace(/\r$/, '');
  } finally {
    reader.releaseLock();
  }
}

/** Server-Sent Events: yields the `data:` payload of each event (joined if multi-line). */
export async function* readSSE(body: ReadableStream<Uint8Array>, onData?: () => void): AsyncIterable<string> {
  let data: string[] = [];
  for await (const line of readLines(body, onData)) {
    if (line === '') {
      if (data.length) yield data.join('\n');
      data = [];
    } else if (line.startsWith('data:')) {
      data.push(line.slice(5).replace(/^ /, ''));
    }
  }
  if (data.length) yield data.join('\n');
}

export function safeJson<T = unknown>(text: string): T | undefined {
  try {
    return JSON.parse(text) as T;
  } catch {
    return undefined;
  }
}

export async function collect(stream: AsyncIterable<string>): Promise<string> {
  let out = '';
  for await (const chunk of stream) out += chunk;
  return out;
}
