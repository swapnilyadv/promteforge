import { APP_DEFAULT_STRATEGY, convert, getStrategy, type ConvertContext, type RequestKind, type StrategyId } from '@promptforge/core';
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
  intent: string;
  /** The approach used, so "another way" can move on to the next one. */
  strategy: { id: StrategyId; name: string };
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
  hooks: { signal?: AbortSignal; onStage?: (stage: ForgeStage) => void; strategy?: StrategyId } = {},
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
    // With a model, the first Forge is the rich full spec; without one the compact brief is all rules can do.
    strategy: hooks.strategy ?? (models.length ? APP_DEFAULT_STRATEGY : undefined),
  });
  const warnings = [...r.warnings];
  if (!models.length) warnings.unshift('Ollama is not running, so this prompt was built from rules only.');
  return {
    prompt: r.prompt,
    mode: r.mode,
    model: r.mode === 'llm' ? model : undefined,
    target: r.target,
    intent: r.intent,
    strategy: { id: r.strategy, name: getStrategy(r.strategy).name },
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
