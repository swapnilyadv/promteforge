import { convert, detectTarget } from '@promptforge/core';
import { createProvider, listOllamaModels, type Provider } from '@promptforge/providers';
import type { ForgeResponse, StatusResponse } from './messages.js';
import type { Settings } from './settings.js';

export type MakeProvider = (s: Settings, model: string | undefined) => Provider;

export const ollamaProvider: MakeProvider = (s, model) =>
  createProvider({ type: 'ollama', baseUrl: s.baseUrl, model });

export async function status(s: Settings): Promise<StatusResponse> {
  const models = await listOllamaModels(s.baseUrl);
  return { running: models.length > 0, models };
}

/** Models the engine was measured with, best first. Anything else installed comes after, in list order. */
const PREFERRED = ['qwen2.5', 'llama3.1'];

/** The user's choice if it is installed; otherwise the best-measured installed model. */
export function pickModel(chosen: string, installed: string[]): string | undefined {
  if (chosen && (installed.length === 0 || installed.includes(chosen))) return chosen;
  for (const family of PREFERRED) {
    const hit = installed.find((m) => m.startsWith(family));
    if (hit) return hit;
  }
  return installed[0];
}

/** The whole job of the Forge button: rough text + page URL in, an engineered prompt out. */
export async function forge(
  req: { text: string; url: string },
  s: Settings,
  makeProvider: MakeProvider = ollamaProvider,
  installed?: string[],
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
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export { detectTarget };
