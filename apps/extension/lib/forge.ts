import { convert, detectTarget } from '@promptforge/core';
import { createProvider, listOllamaModels, pickOllamaModel, type Provider } from '@promptforge/providers';
import type { ForgeResponse, StatusResponse } from './messages.js';
import type { Settings } from './settings.js';

export type MakeProvider = (s: Settings, model: string | undefined) => Provider;

export const ollamaProvider: MakeProvider = (s, model) =>
  createProvider({ type: 'ollama', baseUrl: s.baseUrl, model });

export async function status(s: Settings): Promise<StatusResponse> {
  const models = await listOllamaModels(s.baseUrl);
  return { running: models.length > 0, models };
}

export const pickModel = pickOllamaModel;

/** The whole job of the Forge button: rough text + page URL in, an engineered prompt out. */
export interface ForgeHooks {
  signal?: AbortSignal;
  /** Each streamed piece of the prompt, for a live preview. */
  onToken?: (token: string) => void;
  onStage?: (stage: 'checking-intent' | 'rewriting' | 'repairing') => void;
}

export async function forge(
  req: { text: string; url: string },
  s: Settings,
  makeProvider: MakeProvider = ollamaProvider,
  installed?: string[],
  hooks: ForgeHooks = {},
): Promise<ForgeResponse> {
  const text = req.text.trim();
  if (!text) return { ok: false, error: 'There is no text to rewrite.' };
  try {
    const models = installed ?? (await listOllamaModels(s.baseUrl));
    const model = pickModel(s.model, models);
    const result = await convert({
      text,
      context: { url: req.url },
      style: s.style,
      provider: models.length ? makeProvider(s, model) : undefined,
      model,
      signal: hooks.signal,
      onToken: hooks.onToken,
      onStage: hooks.onStage,
    });
    const warnings = [...result.warnings];
    if (!models.length) warnings.unshift('Ollama is not running, so this prompt was built from rules only.');
    return {
      ok: true,
      prompt: result.prompt,
      target: result.target,
      intent: result.intent,
      mode: result.mode,
      kept: result.validation.keywordRecall,
      model: result.mode === 'llm' ? model : undefined,
      warnings,
    };
  } catch (err) {
    if (hooks.signal?.aborted) return { ok: false, error: 'Cancelled.' };
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export { detectTarget };
