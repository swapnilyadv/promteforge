import { proseWords } from './budget.js';
import type { Structure } from './profiles/index.js';
import type { Slots, ValidationIssue, ValidationReport } from './types.js';

const STOPWORDS = new Set(
  `about above after again against also among because been before being below between both could
  does doing down during each from further have having here hers herself himself into itself just
  more most other ought ours ourselves over same should some such than that their theirs them
  themselves then there these they this those through under until very want what when where which
  while whom with would your yours yourself yourselves will shall make please thanks thank need like
  really something anything everything kind sort give some only also good nice well want wants
  based that's thats what's whats using used uses build builds building make makes making made
  generate create draw write build image picture dont don't doesnt doesn't cant can't wont won't`
    .split(/\s+/)
    .filter(Boolean),
);

/** Content words from the user's prose, used to check nothing important was dropped. */
export function keywords(text: string, inputs: string[] = []): string[] {
  let t = text.replace(/```[\s\S]*?```/g, ' ');
  for (const i of inputs) t = t.split(i).join(' ');
  const words = t.toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}'.+#-]*/gu) ?? [];
  // Numbers are details too ("3 day", "10mb"), however short.
  const keep = (w: string) => (/\d/.test(w) || w.length >= 4) && !STOPWORDS.has(w);
  return [...new Set(words.map((w) => w.replace(/[.'-]+$/, '')).filter(keep))];
}

/** The user's key words that don't appear in the output. */
const NUMBER_WORDS: Record<string, string> = {
  '1': 'one', '2': 'two', '3': 'three', '4': 'four', '5': 'five', '6': 'six', '7': 'seven', '8': 'eight', '9': 'nine', '10': 'ten', '11': 'eleven', '12': 'twelve',
};

export function missingKeywords(original: string, output: string, inputs: string[] = []): string[] {
  // "₹70,000" keeps "70000".
  const out = output.toLowerCase().replace(/(\d),(?=\d)/g, '$1');
  // "3" is kept by "three", and the other way round.
  const word = (k: string) => NUMBER_WORDS[k] ?? Object.entries(NUMBER_WORDS).find(([, w]) => w === k)?.[0];
  return keywords(original, inputs).filter((k) => {
    const alt = word(k);
    return !(out.includes(k) || (k.length > 6 && out.includes(k.slice(0, 6))) || (alt && new RegExp(`\\b${alt}\\b`).test(out)));
  });
}

export function keywordRecall(original: string, output: string, inputs: string[] = []): number {
  const kws = keywords(original, inputs);
  if (kws.length === 0) return 1;
  return Number(((kws.length - missingKeywords(original, output, inputs).length) / kws.length).toFixed(2));
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
  // A stray "<" before the first word ("<Prompt: ...") when the model half-started a tag.
  s = s.replace(/^<(?![A-Za-z_][\w-]*>)\s*/, '');
  // Unwrap <prompt>…</prompt> if the model added it.
  const p = s.match(/^<(improved_)?prompt>\n?([\s\S]*?)\n?<\/(improved_)?prompt>$/);
  if (p) s = p[2]!.trim();
  // Drop a trailing chatty sign-off line.
  s = s.replace(/\n+(let me know|feel free|i hope this|this prompt (will|should))[^\n]*$/i, '').trim();
  // Drop a closing tag at the very end that closes nothing ("...First task\n</goal>").
  const end = s.match(/\n<\/([a-z_][\w-]*)>$/i);
  if (end) {
    const name = end[1]!;
    const opens = (s.match(new RegExp(`<${name}>`, 'g')) ?? []).length;
    const closes = (s.match(new RegExp(`</${name}>`, 'g')) ?? []).length;
    if (closes > opens) s = s.slice(0, end.index).trim();
  }
  return s;
}

/**
 * Small models sometimes describe the person asking in the third person ("The user is 19"). The prompt is
 * written as that person, so for a task (not an app spec, where "the user" means the app's users) it becomes
 * "I am 19".
 */
export function asTheUser(prompt: string): string {
  return prompt
    .replace(/(^|\n)(\s*(?:[-*]|\d+\.)?\s*)The user is\b/g, '$1$2I am')
    .replace(/(^|\n)(\s*(?:[-*]|\d+\.)?\s*)The user has\b/g, '$1$2I have')
    .replace(/(^|\n)(\s*(?:[-*]|\d+\.)?\s*)The user (wants|needs|prefers|likes)\b/g, (_, a: string, b: string, v: string) => `${a}${b}I ${v.replace(/s$/, '')}`)
    .replace(/(^|\n)(\s*(?:[-*]|\d+\.)?\s*)The user's\b/g, '$1$2My')
    .replace(/\bthe user's\b/g, 'my')
    // "I am 19 and has just started" → "and have".
    .replace(/(^|\n)([^\n]*\bI (?:am|have|want|need)\b[^\n]*?)\band (has|is|wants|needs)\b/g, (_, a: string, b: string, v: string) => `${a}${b}and ${v === 'is' ? 'am' : v === 'has' ? 'have' : v.slice(0, -1)}`);
}

/**
 * A line that opens a section: "## Goal", "**Goal**", "**Goal:** text", "**Goal**: text" or "Goal: text".
 * Models write all of these; each is a clear, labelled section.
 */
const SECTION_LABEL = /^(#{1,4} \S.*|\*\*[^*\n]{2,40}(:\*\*|\*\*:?)(\s.*)?|[A-Z][A-Za-z &/]{2,30}:(\s.*)?|\d{1,2}\.\s+[A-Z][A-Za-z&/'-]*(?: [A-Za-z&/'-]+){0,3})$/gm;

function hasStructure(prompt: string, structure: Structure): boolean {
  switch (structure) {
    case 'xml': {
      const tags = prompt.match(/<([a-z][a-z0-9_]*)>[\s\S]*?<\/\1>/g) ?? [];
      return tags.length >= 2;
    }
    case 'markdown':
    case 'code':
      return (prompt.match(SECTION_LABEL) ?? []).length >= 2;
    case 'task-first':
      return (prompt.match(SECTION_LABEL) ?? []).length >= 1;
    case 'image':
      return true;
  }
}

/** Technologies a small model likes to add on its own. Naming one the user did not is inventing a decision for them. */
const TECH_TERMS = [
  'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs', 'nuxt', 'node.js', 'nodejs', 'express', 'django', 'flask',
  'fastapi', 'laravel', 'rails', 'spring boot', 'postgresql', 'postgres', 'mysql', 'mongodb', 'sqlite', 'redis',
  'firebase', 'supabase', 'stripe', 'paypal', 'razorpay', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'tailwind',
  'bootstrap', 'typescript', 'javascript', 'python', 'java', 'golang', 'php', 'graphql', 'jwt', 'oauth',
];

/** Technologies the prompt names that the user did not. */
export function inventedTech(original: string, prompt: string, allowed: string[] = []): string[] {
  const known = `${original} ${allowed.join(' ')}`.toLowerCase();
  const out = prompt.toLowerCase();
  const found = new Set<string>();
  for (const t of TECH_TERMS) {
    const re = new RegExp(`(^|[^a-z0-9.])${t.replace(/\./g, '\\.')}($|[^a-z0-9])`, 'i');
    if (re.test(out) && !re.test(known)) found.add(t);
  }
  // "postgres" and "postgresql" are one choice.
  if (found.has('postgresql')) found.delete('postgres');
  if (found.has('nextjs') && found.has('next.js')) found.delete('nextjs');
  if (found.has('nodejs') && found.has('node.js')) found.delete('nodejs');
  return [...found];
}

export interface ValidateInput {
  prompt: string;
  original: string;
  slots: Slots;
  structure: Structure;
  budget: number;
  /** Skip keyword recall for non-Latin scripts where the model may legitimately transliterate. */
  checkRecall?: boolean;
  /** Extra words the user's setting makes legitimate (the file's language, for example). */
  allowedTerms?: string[];
  /** Share of the user's key words that must survive. 1 (default) means all; rich approaches reword more and allow less. */
  minRecall?: number;
  /** Flag technologies the user never named. On for the strict brief; off for approaches that recommend options. */
  checkInventedTech?: boolean;
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
  } else if (recall < (v.minRecall ?? 1)) {
    const missing = missingKeywords(v.original, prompt, v.slots.inputs);
    issues.push({
      code: 'dropped-details',
      message: `It left out details the user gave: ${missing.map((w) => `"${w}"`).join(', ')}. Put each one back, in the user's words.`,
    });
  }
  for (const input of v.slots.inputs) {
    const probe = input.replace(/\s+/g, ' ').slice(0, 60);
    if (probe.length > 10 && !prompt.replace(/\s+/g, ' ').includes(probe)) {
      issues.push({ code: 'lost-input', message: 'Pasted code / data / quotes must be copied exactly, but some was changed or left out.' });
      break;
    }
  }
  const invented = v.checkInventedTech === false ? [] : inventedTech(v.original, prompt, v.allowedTerms);
  if (invented.length) {
    issues.push({
      code: 'invented-details',
      message: `It names technologies the user never mentioned (${invented.join(', ')}). Remove them and use placeholders like [framework] or [database] instead.`,
    });
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
