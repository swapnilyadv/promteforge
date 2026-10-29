import { APP_DEFAULT_STRATEGY, convert, getStrategy, PROFILES, type ConvertContext, type RequestKind, type StrategyId } from '@promptforge/core';
import { createProvider, listOllamaModels, pickOllamaModel, type Provider } from '@promptforge/providers';

export interface ForgeSettings {
  model: string;
  style: 'concise' | 'balanced' | 'detailed';
  ollamaUrl: string;
}

export type ForgeStage = 'cleaning' | 'checking-intent' | 'rewriting' | 'repairing';

export interface ForgeOutcome {
  prompt: string;
  /** 'llm' = rewritten by the model; 'offline' = built by rules because no model could be used. */
  mode: 'llm' | 'offline';
  model?: string;
  target: string;
  /** The target's display name, e.g. "Cursor". */
  targetLabel: string;
  intent: string;
  /** The approach used, so "another way" can move on to the next one. */
  strategy: { id: StrategyId; name: string };
  /** The focus of this version, if any. */
  angle?: { id: string; name: string };
  /** Which "Another way" this was (0 = the first prompt). */
  variant: number;
  /** A project to build or a plain task: decides which approaches "another way" walks through. */
  kind: RequestKind;
  /** The message with spelling and grammar fixed, when that changed anything. */
  cleaned?: string;
  /** Share of the user's key words that made it into the prompt, 0..1. */
  kept: number;
  warnings: string[];
}

export type MakeProvider = (url: string, model: string | undefined) => Provider;
const ollama: MakeProvider = (url, model) => createProvider({ type: 'ollama', baseUrl: url, model });

/** Rough text plus where the user is (editor, file) in, an engineered prompt out. */
export async function forgeText(
  text: string,
  context: ConvertContext,
  s: ForgeSettings,
  hooks: { signal?: AbortSignal; onStage?: (stage: ForgeStage) => void; strategy?: StrategyId | 'auto'; variant?: number; angle?: string } = {},
  makeProvider: MakeProvider = ollama,
  installed?: string[],
): Promise<ForgeOutcome> {
  const clean = text.trim();
  if (!clean) throw new Error('There is no text to rewrite.');
  const models = installed ?? (await listOllamaModels(s.ollamaUrl));
  const model = pickOllamaModel(s.model, models);
  const r = await convert({
    text: clean,
    context,
    style: s.style,
    provider: models.length ? makeProvider(s.ollamaUrl, model) : undefined,
    model,
    signal: hooks.signal,
    onStage: hooks.onStage,
    // The first Forge picks the approach that fits the request (a full spec for a project); with or without a model.
    strategy: hooks.strategy ?? APP_DEFAULT_STRATEGY,
    variant: hooks.variant ?? 0,
    angle: hooks.angle,
  });
  const warnings = [...r.warnings];
  if (!models.length) warnings.unshift('Built by the rules engine on this computer. For an even better prompt, install Ollama and run: ollama pull qwen2.5:7b');
  return {
    prompt: r.prompt,
    mode: r.mode,
    model: r.mode === 'llm' ? model : undefined,
    target: r.target,
    targetLabel: PROFILES[r.target].label,
    intent: r.intent,
    strategy: { id: r.strategy, name: getStrategy(r.strategy).name },
    angle: r.angle,
    variant: r.variant,
    kind: r.kind,
    cleaned: r.cleaned,
    kept: r.validation.keywordRecall,
    warnings,
  };
}

export const STAGE_TEXT: Record<ForgeStage, string> = {
  cleaning: 'Fixing spelling and grammar…',
  'checking-intent': 'Reading what you want…',
  rewriting: 'Writing the prompt…',
  repairing: 'Checking that every detail is kept…',
};

/**
 * What to rewrite: the selection, or, with nothing selected, the current line. A rough one-line note is
 * the common case, and guessing a whole file would be surprising.
 */
export function pickRange(selectionText: string, lineText: string): { text: string; useLine: boolean } | undefined {
  if (selectionText.trim()) return { text: selectionText, useLine: false };
  if (lineText.trim()) return { text: lineText, useLine: true };
  return undefined;
}
