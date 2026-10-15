import { convert, PROFILES, type ConvertResult, type Style } from '@promptforge/core';
import { createProvider, type Provider, type ProviderConfig } from '@promptforge/providers';
import { readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { judgePair, type JudgeVerdict } from './judge.js';
import { pct, scoreCase, type CaseScore, type EvalCase } from './score.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const HELP = `PromptForge eval harness

  pnpm eval                          offline baseline (rules only, no model, no cost)
  pnpm eval -p ollama -m qwen2.5:7b  rewrite with a model
  pnpm eval -j anthropic             also run the blind pairwise judge with this provider
  pnpm eval --set holdout            run the held-out cases (not used for tuning)
  pnpm eval --only code,dbg          only case ids starting with these prefixes
  pnpm eval --limit 11               quick run: N cases spread across all intents
  pnpm eval --concurrency 2          parallel requests (default: 1 local model, 3 cloud, 8 offline)
  pnpm eval --style detailed         concise | balanced | detailed
  pnpm eval --out results.md         write the report (default evals/results.md)
  pnpm eval --verbose                print failing cases and why model runs fell back

Progress: "." = model output used, "f" = fell back to the rules-based prompt.

Providers: offline | ollama | lmstudio | openai | anthropic | gemini | openrouter
Judge keys: OPENAI_API_KEY / ANTHROPIC_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY
`;

function provider(name: string, model?: string): Provider | undefined {
  const need = (k: string) => {
    const v = process.env[k];
    if (!v) throw new Error(`${k} is not set`);
    return v;
  };
  const cfg: Record<string, () => ProviderConfig | undefined> = {
    offline: () => undefined,
    ollama: () => ({ type: 'ollama', model }),
    lmstudio: () => ({ type: 'lmstudio', model }),
    openai: () => ({ type: 'openai', apiKey: need('OPENAI_API_KEY'), model }),
    openrouter: () => ({ type: 'openrouter', apiKey: need('OPENROUTER_API_KEY'), model }),
    anthropic: () => ({ type: 'anthropic', apiKey: need('ANTHROPIC_API_KEY'), model }),
    gemini: () => ({ type: 'gemini', apiKey: need('GEMINI_API_KEY'), model }),
  };
  const make = cfg[name];
  if (!make) throw new Error(`Unknown provider "${name}"`);
  const c = make();
  return c ? createProvider(c) : undefined;
}

/** Small deterministic PRNG so judge A/B order is reproducible between runs. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function pool<T, R>(items: T[], size: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]!);
      }
    }),
  );
  return out;
}

interface Row {
  c: EvalCase;
  s: CaseScore;
  mode: string;
  fallback?: ConvertResult['fallback'];
  words: number;
  ms: number;
  verdict?: JudgeVerdict;
  prompt: string;
}

function avg(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Up to `n` cases taken round-robin across intents, so a small run still covers every task type. */
function spread(cases: EvalCase[], n: number): EvalCase[] {
  const byIntent = new Map<string, EvalCase[]>();
  for (const c of cases) byIntent.set(c.intent, [...(byIntent.get(c.intent) ?? []), c]);
  const out: EvalCase[] = [];
  for (let i = 0; out.length < Math.min(n, cases.length); i++) {
    for (const group of byIntent.values()) if (group[i] && out.length < n) out.push(group[i]!);
  }
  return out;
}

function positiveInt(flag: string, v: string): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) throw new Error(`--${flag} must be a positive integer, got "${v}"`);
  return n;
}

function duration(ms: number): string {
  const s = Math.round(ms / 1000);
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`;
}

async function main() {
  const { values } = parseArgs({
    options: {
      provider: { type: 'string', short: 'p', default: 'offline' },
      model: { type: 'string', short: 'm' },
      judge: { type: 'string', short: 'j' },
      'judge-model': { type: 'string' },
      style: { type: 'string', default: 'balanced' },
      only: { type: 'string' },
      limit: { type: 'string', short: 'n' },
      concurrency: { type: 'string', short: 'c' },
      set: { type: 'string', default: 'cases' },
      out: { type: 'string', default: join(ROOT, 'results.md') },
      verbose: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });
  if (values.help) return void process.stdout.write(HELP);

  let cases = JSON.parse(readFileSync(join(ROOT, `${values.set}.json`), 'utf8')) as EvalCase[];
  if (values.only) {
    const prefixes = values.only.split(',');
    cases = cases.filter((c) => prefixes.some((p) => c.id.startsWith(p)));
  }
  const total = cases.length;
  if (values.limit) cases = spread(cases, positiveInt('limit', values.limit));
  const style = values.style as Style;
  const gen = provider(values.provider!, values.model);
  const judge = values.judge ? provider(values.judge, values['judge-model']) : undefined;
  // A local model serves one request at a time; parallel requests just queue up and time out.
  const concurrency = values.concurrency ? positiveInt('concurrency', values.concurrency) : gen ? (gen.isLocal ? 1 : 3) : 8;
  // Draw each case's A/B order up front, so the judge's order doesn't depend on which request finishes first.
  const rng = mulberry32(42);
  const coin = new Map(cases.map((c) => [c.id, rng()]));
  const label = gen ? `${gen.id}${values.model ? ` (${values.model})` : ''}` : 'offline (rules only)';

  console.log(`Running ${cases.length} cases · engine: ${label} · judge: ${judge ? judge.id : 'none'} · ${concurrency} at a time`);

  const t0 = Date.now();
  const rows = await pool(cases, concurrency, async (c): Promise<Row> => {
    const r = await convert({ text: c.text, target: c.target, style, provider: gen, model: values.model });
    const s = scoreCase(c, r);
    let verdict: JudgeVerdict | undefined;
    if (judge) {
      try {
        verdict = await judgePair(judge, PROFILES[c.target].label, c.text, r.prompt, () => coin.get(c.id)!);
      } catch (e) {
        console.error(`judge failed on ${c.id}: ${e instanceof Error ? e.message : e}`);
      }
    }
    process.stdout.write(r.fallback ? 'f' : '.');
    return { c, s, mode: r.mode, fallback: r.fallback, words: r.validation.words, ms: r.ms, verdict, prompt: r.prompt };
  });
  const elapsed = duration(Date.now() - t0);
  console.log(`\n\nFinished in ${elapsed}\n`);

  // ---- aggregate ----
  const n = rows.length;
  const intentOk = rows.filter((r) => r.s.intentOk).length;
  const valOk = rows.filter((r) => r.s.validationOk).length;
  const fullKeep = rows.filter((r) => r.s.keepRecall === 1).length;
  const llm = rows.filter((r) => r.mode === 'llm').length;
  const meanScore = avg(rows.map((r) => r.s.score));
  // With a model, fallback rows are scored on the rules-based prompt: keep them apart.
  const modelRows = rows.filter((r) => r.mode === 'llm');
  const modelScore = modelRows.length ? avg(modelRows.map((r) => r.s.score)).toFixed(1) : '—';
  const fellBack = rows.filter((r) => r.fallback);
  const fbErrors = fellBack.filter((r) => r.fallback!.reason === 'error').length;
  const fbChecks = fellBack.length - fbErrors;
  const judged = rows.filter((r) => r.verdict);
  const wins = judged.filter((r) => r.verdict!.winner === 'prompt').length;
  const ties = judged.filter((r) => r.verdict!.winner === 'tie').length;
  const losses = judged.length - wins - ties;
  const judgedModel = judged.filter((r) => r.mode === 'llm');
  const modelWins = judgedModel.filter((r) => r.verdict!.winner === 'prompt').length;

  const byIntent = new Map<string, Row[]>();
  for (const r of rows) byIntent.set(r.c.intent, [...(byIntent.get(r.c.intent) ?? []), r]);
  const byTarget = new Map<string, Row[]>();
  for (const r of rows) byTarget.set(r.c.target, [...(byTarget.get(r.c.target) ?? []), r]);

  const line = (k: string, v: string) => console.log(`${k.padEnd(34)} ${v}`);
  line('Cases', String(n));
  line('Intent classified correctly', `${intentOk}/${n} (${pct(intentOk, n)})`);
  line('All must-keep details preserved', `${fullKeep}/${n} (${pct(fullKeep, n)})`);
  line('Passed validators', `${valOk}/${n} (${pct(valOk, n)})`);
  line('Mean score (0-100)', meanScore.toFixed(1));
  if (gen) {
    line('Model output used (not fallback)', `${llm}/${n} (${pct(llm, n)})`);
    line('Mean score, model output only', modelScore);
    if (fellBack.length) line('Fallbacks: model error · failed checks', `${fbErrors} · ${fbChecks}`);
  }
  if (judged.length) {
    line('Blind judge: prompt wins', `${wins}/${judged.length} (${pct(wins, judged.length)}) · ties ${ties} · losses ${losses}`);
    line('Win rate counting ties as half', pct(wins + ties / 2, judged.length));
    if (gen) line('Judge wins, model output only', `${modelWins}/${judgedModel.length} (${pct(modelWins, judgedModel.length)})`);
  }

  const failing = rows.filter((r) => r.s.score < 100).sort((a, b) => a.s.score - b.s.score);
  if (values.verbose) {
    console.log('\nCases below 100:');
    for (const r of failing) {
      const bits = [
        r.s.intentOk ? '' : `intent want ${r.c.intent}, got ${r.s.gotIntent}`,
        r.s.missingKeep.length ? `missing: ${r.s.missingKeep.join(', ')}` : '',
        r.s.issues.length ? `issues: ${r.s.issues.join(', ')}` : '',
      ].filter(Boolean);
      console.log(`  ${r.s.score.toString().padStart(3)}  ${r.c.id.padEnd(8)} ${bits.join(' | ')}`);
    }
    if (fellBack.length) {
      console.log('\nFell back to the rules-based prompt:');
      for (const r of fellBack) console.log(`  ${r.c.id.padEnd(8)} ${r.fallback!.reason}: ${r.fallback!.detail}`);
    }
  }

  // ---- report ----
  const md: string[] = [];
  md.push('# PromptForge eval results', '');
  md.push(`- Engine: **${label}**, style \`${style}\``);
  md.push(`- Judge: ${judge ? `**${judge.id}** (blind, A/B order randomised)` : 'not run'}`);
  md.push(`- Cases: ${n}${n < total ? ` of ${total} (\`--limit\`, spread across intents)` : ''} · Core profiles v${PROFILES.claude.version}`);
  md.push(`- Run time: ${elapsed}, ${concurrency} at a time`, '');
  md.push('## Summary', '');
  md.push('| Metric | Result |', '| --- | --- |');
  md.push(`| Intent classified correctly | ${intentOk}/${n} (${pct(intentOk, n)}) |`);
  md.push(`| All must-keep details preserved | ${fullKeep}/${n} (${pct(fullKeep, n)}) |`);
  md.push(`| Passed validators | ${valOk}/${n} (${pct(valOk, n)}) |`);
  md.push(`| Mean score (0–100) | ${meanScore.toFixed(1)} |`);
  if (gen) {
    md.push(`| Model output used (not fallback) | ${llm}/${n} (${pct(llm, n)}) |`);
    md.push(`| Mean score, model output only | ${modelScore} |`);
  }
  if (judged.length) {
    md.push(`| **Blind judge: engineered prompt wins** | **${wins}/${judged.length} (${pct(wins, judged.length)})**, ties ${ties}, losses ${losses} |`);
    if (gen) md.push(`| Judge wins, model output only | ${modelWins}/${judgedModel.length} (${pct(modelWins, judgedModel.length)}) |`);
    md.push(`| Target (session 6) | ≥ 85% |`);
  }
  md.push('', '## By intent', '', '| Intent | Cases | Intent ok | Keep recall | Mean score |', '| --- | --- | --- | --- | --- |');
  for (const [k, rs] of [...byIntent].sort()) {
    md.push(`| ${k} | ${rs.length} | ${pct(rs.filter((r) => r.s.intentOk).length, rs.length)} | ${Math.round(avg(rs.map((r) => r.s.keepRecall)) * 100)}% | ${avg(rs.map((r) => r.s.score)).toFixed(1)} |`);
  }
  md.push('', '## By target', '', '| Target | Cases | Validators ok | Mean score |', '| --- | --- | --- | --- |');
  for (const [k, rs] of [...byTarget].sort()) {
    md.push(`| ${k} | ${rs.length} | ${pct(rs.filter((r) => r.s.validationOk).length, rs.length)} | ${avg(rs.map((r) => r.s.score)).toFixed(1)} |`);
  }
  md.push('', '## Cases below 100', '', '| Case | Score | Problem |', '| --- | --- | --- |');
  for (const r of failing) {
    const bits = [
      r.s.intentOk ? '' : `intent: wanted ${r.c.intent}, got ${r.s.gotIntent}`,
      r.s.missingKeep.length ? `missing ${r.s.missingKeep.map((m) => `"${m}"`).join(', ')}` : '',
      r.s.issues.length ? `validator: ${r.s.issues.join(', ')}` : '',
      !r.s.lengthOk ? 'length' : '',
    ].filter(Boolean);
    md.push(`| ${r.c.id} | ${r.s.score} | ${bits.join('; ')} |`);
  }
  if (fellBack.length) {
    md.push('', '## Fell back to the rules-based prompt', '', 'These cases were scored on the rules-based prompt, not the model\'s.', '');
    md.push('| Case | Reason | Detail |', '| --- | --- | --- |');
    for (const r of fellBack) md.push(`| ${r.c.id} | ${r.fallback!.reason} | ${r.fallback!.detail.replace(/\|/g, '/')} |`);
  }
  if (judged.length) {
    const lost = judged.filter((r) => r.verdict!.winner === 'original');
    if (lost.length) {
      md.push('', '## Judge preferred the original', '', '| Case | Why |', '| --- | --- |');
      for (const r of lost) md.push(`| ${r.c.id} | ${r.verdict!.reason.replace(/\|/g, '/')} |`);
    }
  }
  writeFileSync(values.out!, md.join('\n') + '\n');
  console.log(`\nReport written to ${values.out}`);
}

main().catch((e) => {
  console.error(`eval: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
});
