import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { convert, type Intent, type Target } from '../src/index.js';

interface Case {
  id: string;
  target: Target;
  intent: Intent;
  text: string;
  keep: string[];
}

const load = (name: string): Case[] =>
  JSON.parse(readFileSync(new URL(`../../../evals/${name}.json`, import.meta.url), 'utf8'));

/**
 * Guards the offline engine against regressions. The full report (with per-case detail)
 * comes from `pnpm eval`; this just fails CI if quality drops below the floor.
 */
describe('eval regression (offline engine)', () => {
  for (const set of ['cases', 'holdout']) {
    it(`${set}: intent ≥ 95%, details kept ≥ 98%, validators 100%`, async () => {
      const cases = load(set);
      let intentOk = 0;
      let keepOk = 0;
      let valOk = 0;
      const bad: string[] = [];
      for (const c of cases) {
        const r = await convert({ text: c.text, target: c.target });
        const out = r.prompt.toLowerCase();
        const kept = c.keep.every((k) => out.includes(k.toLowerCase()));
        if (r.intent === c.intent) intentOk++;
        else bad.push(`${c.id}: wanted ${c.intent}, got ${r.intent}`);
        if (kept) keepOk++;
        else bad.push(`${c.id}: lost a must-keep detail`);
        if (r.validation.ok) valOk++;
        else bad.push(`${c.id}: validator ${r.validation.issues.map((i) => i.code).join(',')}`);
      }
      const n = cases.length;
      expect(intentOk / n, bad.join('\n')).toBeGreaterThanOrEqual(0.95);
      expect(keepOk / n, bad.join('\n')).toBeGreaterThanOrEqual(0.98);
      expect(valOk / n, bad.join('\n')).toBe(1);
    });
  }
});
