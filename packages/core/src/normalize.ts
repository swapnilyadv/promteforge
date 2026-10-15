import type { NormalizedInput } from './types.js';

/** UI text that often gets pasted along with real content. Only removed on lines of their own. */
const UI_NOISE = [
  /^copy code$/i,
  /^copy$/i,
  /^regenerate( response)?$/i,
  /^edit$/i,
  /^share$/i,
  /^retry$/i,
  /^\d+\s*\/\s*\d+$/, // "2 / 2" branch counters
];

const SECRET_PATTERNS: { kind: string; re: RegExp }[] = [
  { kind: 'anthropic-key', re: /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g },
  { kind: 'openai-key', re: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { kind: 'google-key', re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  { kind: 'github-token', re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g },
  { kind: 'aws-access-key', re: /\bAKIA[0-9A-Z]{16}\b/g },
  { kind: 'slack-token', re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  { kind: 'private-key', re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g },
  { kind: 'jwt', re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g },
  { kind: 'password', re: /\b(?:password|passwd|pwd)\s*[:=]\s*\S{4,}/gi },
];

export function detectLanguage(text: string): string {
  const sample = text.replace(/```[\s\S]*?```/g, '').slice(0, 2000);
  const counts: Record<string, number> = {};
  const scripts: [string, RegExp][] = [
    ['hi', /[ऀ-ॿ]/g], // Devanagari (Hindi, Marathi)
    ['bn', /[ঀ-৿]/g],
    ['ta', /[஀-௿]/g],
    ['te', /[ఀ-౿]/g],
    ['gu', /[઀-૿]/g],
    ['ar', /[؀-ۿ]/g],
    ['ru', /[Ѐ-ӿ]/g],
    ['ja', /[぀-ヿ]/g],
    ['ko', /[가-힯]/g],
    ['zh', /[一-鿿]/g],
    ['en', /[A-Za-z]/g],
  ];
  for (const [lang, re] of scripts) counts[lang] = (sample.match(re) ?? []).length;
  // Japanese text also contains CJK ideographs; kana decides.
  if ((counts.ja ?? 0) > 0) counts.zh = 0;
  let best = 'en';
  let max = 0;
  for (const [lang, n] of Object.entries(counts)) {
    // Latin letters are common inside other languages (code, names) — weigh them down.
    const weighted = lang === 'en' ? n * 0.5 : n;
    if (weighted > max) {
      max = weighted;
      best = lang;
    }
  }
  return best;
}

/** Find secrets and swap them for stable placeholders. */
export function redactSecrets(text: string): { text: string; redactions: NormalizedInput['redactions'] } {
  const redactions: NormalizedInput['redactions'] = [];
  let out = text;
  for (const { kind, re } of SECRET_PATTERNS) {
    out = out.replace(re, (value) => {
      const existing = redactions.find((r) => r.value === value);
      if (existing) return existing.placeholder;
      const placeholder = `[REDACTED_SECRET_${redactions.length + 1}]`;
      redactions.push({ placeholder, value, kind });
      return placeholder;
    });
  }
  return { text: out, redactions };
}

export function restoreSecrets(text: string, redactions: NormalizedInput['redactions']): string {
  let out = text;
  for (const r of redactions) out = out.split(r.placeholder).join(r.value);
  return out;
}

export function normalize(raw: string): NormalizedInput {
  // Protect fenced code: never touch whitespace inside it.
  const fences: string[] = [];
  let text = raw.replace(/\r\n?/g, '\n').replace(/```[\s\S]*?```/g, (m) => {
    fences.push(m);
    return `\u0000FENCE${fences.length - 1}\u0000`;
  });

  text = text
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .filter((l) => !UI_NOISE.some((re) => re.test(l.trim())))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  text = text.replace(/\u0000FENCE(\d+)\u0000/g, (_, i) => fences[Number(i)] ?? '');

  const { text: redacted, redactions } = redactSecrets(text);
  return { text: redacted, language: detectLanguage(text), redactions };
}
