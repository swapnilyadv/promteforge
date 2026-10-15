import { proseWords } from './budget.js';
import type { Structure } from './profiles/index.js';
import type { Slots, ValidationIssue, ValidationReport } from './types.js';

const STOPWORDS = new Set(
  `about above after again against also among because been before being below between both could
  does doing down during each from further have having here hers herself himself into itself just
  more most other ought ours ourselves over same should some such than that their theirs them
  themselves then there these they this those through under until very want what when where which
  while whom with would your yours yourself yourselves will shall make please thanks thank need like
  really something anything everything kind sort give some only also good nice well want wants`
    .split(/\s+/)
    .filter(Boolean),
);

/** Content words from the user's prose, used to check nothing important was dropped. */
export function keywords(text: string, inputs: string[] = []): string[] {
  let t = text.replace(/```[\s\S]*?```/g, ' ');
  for (const i of inputs) t = t.split(i).join(' ');
  const words = t.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'.+#-]*/gu) ?? [];
  return [...new Set(words.map((w) => w.replace(/[.'-]+$/, '')).filter((w) => w.length >= 4 && !STOPWORDS.has(w)))];
}

export function keywordRecall(original: string, output: string, inputs: string[] = []): number {
  const kws = keywords(original, inputs);
  if (kws.length === 0) return 1;
  const out = output.toLowerCase();
  const hit = kws.filter((k) => out.includes(k) || (k.length > 6 && out.includes(k.slice(0, 6)))).length;
  return Number((hit / kws.length).toFixed(2));
}

const PREAMBLE = /^(here('s| is| are)|sure[,!.]|certainly|of course|below is|okay[,!.]|ok[,!.]|absolutely|great[,!.]|i('ve| have) (rewritten|created|improved))/i;

/** Removes common wrapper noise an LLM adds around the prompt. Safe to run on any output. */
export function postprocess(raw: string): string {
  let s = raw.replace(/\r\n?/g, '\n').trim();
  // Drop a leading "Here is your improved prompt:" line.
  const firstLine = s.split('\n')[0] ?? '';
  if (PREAMBLE.test(firstLine) && firstLine.trim().endsWith(':')) s = s.slice(firstLine.length).trim();
  // Drop a trailing chatty sign-off line (before unwrapping, so a fence can close the text).
  s = s.replace(/\n+(let me know|feel free|i hope this|this prompt (will|should))[^\n]*$/i, '').trim();
  // Unwrap a single code fence around the whole output (``` or ```markdown/xml/text).
  const m = s.match(/^```(?:markdown|md|xml|text|txt|prompt)?\n([\s\S]*?)\n```$/);
  if (m) s = m[1]!.trim();
  // Unwrap <prompt>…</prompt> if the model added it.
  const p = s.match(/^<(improved_)?prompt>\n?([\s\S]*?)\n?<\/(improved_)?prompt>$/);
  if (p) s = p[2]!.trim();
  // Drop a trailing chatty sign-off line.
  s = s.replace(/\n+(let me know|feel free|i hope this|this prompt (will|should))[^\n]*$/i, '').trim();
  return s;
}

function hasStructure(prompt: string, structure: Structure): boolean {
  switch (structure) {
    case 'xml': {
      const tags = prompt.match(/<([a-z][a-z0-9_]*)>[\s\S]*?<\/\1>/g) ?? [];
      return tags.length >= 2;
    }
    case 'markdown':
    case 'code': {
      const headers = prompt.match(/^(#{1,4} .+|\*\*[^*\n]+\*\*:?\s*$|[A-Z][A-Za-z &/]{2,30}:\s*$)/gm) ?? [];
      return headers.length >= 2;
    }
    case 'task-first': {
      const labels = prompt.match(/^(#{1,4} .+|\*\*?[^*\n]{2,30}\*\*?:|[A-Z][A-Za-z &/]{2,30}:)/gm) ?? [];
      return labels.length >= 1;
    }
    case 'image':
      return true;
  }
}

export interface ValidateInput {
  prompt: string;
  original: string;
  slots: Slots;
  structure: Structure;
  budget: number;
  /** Skip keyword recall for non-Latin scripts where the model may legitimately transliterate. */
  checkRecall?: boolean;
}

export function validatePrompt(v: ValidateInput): ValidationReport {
  const issues: ValidationIssue[] = [];
  const prompt = v.prompt.trim();
  const words = proseWords(prompt, v.slots.inputs);
  const recall = v.checkRecall === false ? 1 : keywordRecall(v.original, prompt, v.slots.inputs);

  if (!prompt) {
    issues.push({ code: 'empty', message: 'The prompt is empty.' });
    return { ok: false, issues, keywordRecall: 0, words: 0, budget: v.budget };
  }
  if (PREAMBLE.test(prompt.split('\n')[0] ?? '')) {
    issues.push({ code: 'preamble', message: 'It starts with a preface like "Here is…". Output only the prompt itself.' });
  }
  if (recall < 0.5) {
    issues.push({
      code: 'meaning-drift',
      message: `It dropped too many of the user's own details (kept ${Math.round(recall * 100)}% of key words). Keep every goal, name and constraint the user gave.`,
    });
  }
  for (const input of v.slots.inputs) {
    const probe = input.replace(/\s+/g, ' ').slice(0, 60);
    if (probe.length > 10 && !prompt.replace(/\s+/g, ' ').includes(probe)) {
      issues.push({ code: 'lost-input', message: 'Pasted code / data / quotes must be copied exactly, but some was changed or left out.' });
      break;
    }
  }
  if (!hasStructure(prompt, v.structure)) {
    issues.push({
      code: 'missing-structure',
      message:
        v.structure === 'xml'
          ? 'Use XML-tagged sections (e.g. <context>, <task>, <output_format>).'
          : 'Use clearly labelled sections (headers such as Goal, Context, Requirements, Output format).',
    });
  }
  if (words > v.budget * 1.35) {
    issues.push({ code: 'too-long', message: `It is ${words} words; keep the prompt's own words under about ${v.budget}.` });
  }
  if (/\{\{|\}\}|\{(goal|role|target|intent|user_request)\}/.test(prompt) || /<\/?user_request>/.test(prompt)) {
    issues.push({ code: 'template-leftover', message: 'Remove leftover template markers.' });
  }

  return { ok: issues.length === 0, issues, keywordRecall: recall, words, budget: v.budget };
}
