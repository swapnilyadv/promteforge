import type { ConvertResult, Intent, Target } from '@promptforge/core';

export interface EvalCase {
  id: string;
  target: Target;
  intent: Intent;
  text: string;
  /** Words or phrases from the user's request that MUST survive into the prompt. */
  keep: string[];
}

export interface CaseScore {
  id: string;
  intentOk: boolean;
  /** Share of `keep` terms present in the prompt (case-insensitive). */
  keepRecall: number;
  missingKeep: string[];
  validationOk: boolean;
  issues: string[];
  /** Prompt is longer than the input, but not absurdly so. */
  lengthOk: boolean;
  noPreamble: boolean;
  /** 0..100, weighted. */
  score: number;
}

const PREAMBLE = /^(here('s| is| are)|sure[,!.]|certainly|of course|below is|okay[,!.]|absolutely)/i;

/** Deterministic checks — no model needed. */
export function scoreCase(c: EvalCase, r: ConvertResult): CaseScore {
  const out = r.prompt.toLowerCase();
  const missingKeep = c.keep.filter((k) => !out.includes(k.toLowerCase()));
  const keepRecall = c.keep.length ? (c.keep.length - missingKeep.length) / c.keep.length : 1;
  const intentOk = r.intent === c.intent;
  const inWords = c.text.split(/\s+/).length;
  const outWords = r.prompt.split(/\s+/).length;
  const lengthOk = outWords >= Math.min(inWords, 8) && outWords <= Math.max(120, inWords * 14);
  const noPreamble = !PREAMBLE.test(r.prompt);
  const validationOk = r.validation.ok;

  const score = Math.round(
    (intentOk ? 25 : 0) + keepRecall * 40 + (validationOk ? 20 : 0) + (lengthOk ? 10 : 0) + (noPreamble ? 5 : 0),
  );
  return {
    id: c.id,
    intentOk,
    keepRecall: Number(keepRecall.toFixed(2)),
    missingKeep,
    validationOk,
    issues: r.validation.issues.map((i) => i.code),
    lengthOk,
    noPreamble,
    score,
  };
}

export function pct(n: number, d: number): string {
  return d === 0 ? '—' : `${Math.round((n / d) * 100)}%`;
}
