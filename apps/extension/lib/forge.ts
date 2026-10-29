import { APP_DEFAULT_STRATEGY, convert, detectTarget, getStrategy, PROFILES, type StrategyId } from '@promptforge/core';
import { createProvider, listOllamaModels, pickOllamaModel, type Provider } from '@promptforge/providers';
import type { ForgeResponse, Stage, StatusResponse } from './messages.js';
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
  onStage?: (stage: Stage) => void;
}

export async function forge(
  req: { text: string; url: string; strategy?: StrategyId; variant?: number },
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
      // The first Forge picks the approach that fits the request (a full spec for a project); with or without a model.
      // The first Forge uses the type and focus picked in the popup; "Another way" sends the next type and a variant.
      strategy: req.strategy ?? ((s.strategy || APP_DEFAULT_STRATEGY) as StrategyId | 'auto'),
      variant: req.variant ?? 0,
      angle: req.variant ? undefined : s.angle || undefined,
      style: s.style,
      provider: models.length ? makeProvider(s, model) : undefined,
      model,
      signal: hooks.signal,
      onToken: hooks.onToken,
      onStage: hooks.onStage,
    });
    const warnings = [...result.warnings];
    if (!models.length) warnings.unshift('Built by the rules engine on this device. Add the free local model for an even better prompt: see the PromptForge popup.');
    return {
      ok: true,
      prompt: result.prompt,
      target: result.target,
      targetLabel: PROFILES[result.target].label,
      intent: result.intent,
      strategy: { id: result.strategy, name: getStrategy(result.strategy).name },
      angle: result.angle,
      variant: result.variant,
      kind: result.kind,
      cleaned: result.cleaned,
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
