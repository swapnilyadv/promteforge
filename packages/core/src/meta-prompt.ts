import type { Angle } from './angles.js';
import type { ChatMessage } from '@promptforge/providers';
import type { ModelProfile } from './profiles/index.js';
import type { IntentTemplate } from './templates.js';
import type { Strategy } from './strategies.js';
import type { ConvertContext, Intent, Slots, Style, ValidationIssue } from './types.js';

export const META_PROMPT_VERSION = 5;

/** Short budgets can't hold every section: small models follow the section list over the word limit. */
function maxSections(budget: number, available: number): number {
  return Math.min(available, budget < 120 ? 3 : budget < 200 ? 4 : available);
}

const LANG_NAMES: Record<string, string> = {
  en: 'English', hi: 'Hindi', bn: 'Bengali', ta: 'Tamil', te: 'Telugu', gu: 'Gujarati',
  ar: 'Arabic', ru: 'Russian', ja: 'Japanese', ko: 'Korean', zh: 'Chinese',
};

export interface MetaPromptInput {
  text: string;
  profile: ModelProfile;
  intent: Intent;
  template: IntentTemplate;
  slots: Slots;
  style: Style;
  budget: number;
  language: string;
  askQuestions: boolean;
  alreadyStructured: boolean;
  missing: (keyof Slots)[];
  context?: ConvertContext;
  strategy: Strategy;
  /** Built-in notes about this kind of project and its market (rich approaches only). */
  notes?: string[];
  /** The focus of this version ("Another way" or the user's pick). */
  angle?: Angle;
}

/** Rich approaches expand a seed idea into the prompt an expert would write; `brief` stays strict and compact. */
function isRich(m: MetaPromptInput): boolean {
  return m.strategy.rich && m.intent !== 'image';
}

function richSystemPrompt(m: MetaPromptInput): string {
  const lang = LANG_NAMES[m.language] ?? 'the same language as the user';
  const format =
    m.strategy.prose
      ? 'Follow the approach below: flowing first-person sentences plus one bulleted list. No numbered section headings.'
      : m.profile.structure === 'xml'
        ? 'Use XML tags for the sections (for example <goal>...</goal>), in the order given below.'
        : 'Use Markdown: write each part name below as a heading on its own line (## Name), bullets with "*", in the order given below.';
  return [
    `You are PromptForge, a world-class prompt engineer. You turn a user's rough idea into the prompt an expert would write for ${m.profile.label}: complete, specific and ready to paste.`,
    '',
    'RULES',
    "1. Expand the idea. Add the sections, features, requirements, constraints and steps that a strong version of this request normally needs, using good judgment about what is missing. The user's short message is a seed, not the whole prompt.",
    "2. Keep everything the user said (goals, names, brands, places, numbers, preferences) and let it shape the whole prompt. Read the clues: a named company, city, currency or language tells you the market and context, so tailor to it (for example a city or company in India suggests rupees, UPI and GST; one in the UK suggests pounds and GDPR). Use only the market the request points to; if it points to none, do not assume one.",
    "3. \"Like\", \"based on\" or \"inspired by\" a named company or product means taking inspiration from how it works. Never ask for that company's APIs, data, branding, accounts or integration, and say that the result should have its own identity.",
    "4. Never invent facts about the user personally (their budget, deadline, team, brand name, experience). Where those matter, tell the AI to ask the user for them.",
    '5. Suggest technologies, tools and methods only as options to consider, or as something for the AI to recommend. Never present them as fixed requirements.',
    '6. Fix every spelling and grammar mistake and write clean, natural, confident English. Remove anything addressed to a chatbot, such as "hey ChatGPT" or "convert this into a prompt": that is an instruction to you, not part of the request.',
    '7. Write the prompt to the AI, in the first person as the user ("I want...", "Explain to me...", "I am 19..."). Facts about the user stay about "me": never "the user is...", and never turn a request for the user into one for someone else. It is a prompt, not an answer: do not perform the task.',
    `8. Write in ${lang} (keep code and technical terms as they are).`,
    '9. Output ONLY the final prompt. No preface ("Here is..."), no explanations, no closing remarks, no surrounding code fence.',
    `10. Length: about ${m.budget} words.`,
    '',
    `TARGET: ${m.profile.label}`,
    `Formatting: ${format}`,
  ].join('\n');
}

function systemPrompt(m: MetaPromptInput): string {
  if (isRich(m)) return richSystemPrompt(m);
  const lang = LANG_NAMES[m.language] ?? 'the same language as the user';
  return [
    `You are PromptForge, a world-class prompt engineer. You rewrite a user's rough request into the best possible prompt for ${m.profile.label}.`,
    '',
    'NON-NEGOTIABLE RULES',
    "1. Preserve meaning: keep every goal, fact, name, number, constraint and preference the user gave. Do not drop any of them. Fix spelling and grammar mistakes silently, and write the prompt in clean, natural wording: do not copy the user's typos or clumsy phrasing.",
    '2. Never invent specifics the user did not give (names, numbers, data, deadlines), and never pick technologies, frameworks, libraries, databases or providers for them, not even as an example in brackets: use a placeholder like [framework] instead. Where a missing detail matters, insert a short bracketed placeholder like [target audience]. The only exception is a sample that the approach asks for, which must be marked as illustrative.',
    '3. Copy code, error messages, data and quoted text EXACTLY as given, inside their own clearly delimited section.',
    '4. Write the prompt in the user\'s voice, addressed to the AI (e.g. "You are…", "Write…"). It is a prompt, not an answer — do not perform the task.',
    `5. Write in ${lang} (keep code and technical terms as they are).`,
    '6. Output ONLY the final prompt. No preface ("Here is…"), no explanations, no closing remarks, no surrounding code fence.',
    `7. Keep the prompt's own words within about ${m.budget} words (verbatim code/data does not count). Short requests get short prompts.`,
    '',
    `TARGET: ${m.profile.label}`,
    `Layout: ${m.profile.layout}`,
    'Model-specific rules:',
    ...m.profile.rules.map((r) => `- ${r}`),
  ].join('\n');
}

function richUserPrompt(m: MetaPromptInput): string {
  const lines: string[] = [];
  lines.push(`Task type: ${m.intent}.`);
  lines.push(`APPROACH: ${m.strategy.name}. ${m.strategy.instruction}`);
  lines.push('', 'Write these parts, in this order:');
  for (const part of m.strategy.skeleton ?? []) lines.push(`- ${part.key}: ${part.guidance}`);
  if (m.strategy.exemplar) {
    lines.push(
      '',
      'EXAMPLE of this style, written for a completely different request. Copy its style, structure and level of detail, never its topic or its content:',
      '<example>',
      m.strategy.exemplar,
      '</example>',
    );
  }
  const known: string[] = [];
  if (m.slots.audience) known.push(`audience = ${m.slots.audience}`);
  if (m.slots.tone) known.push(`tone = ${m.slots.tone}`);
  if (m.slots.length) known.push(`length = ${m.slots.length}`);
  if (m.slots.format) known.push(`format = ${m.slots.format}`);
  if (m.slots.tech.length) known.push(`tech the user named = ${m.slots.tech.join(', ')}`);
  if (m.context?.languageId) known.push(`editor language = ${m.context.languageId}`);
  if (m.context?.fileName) known.push(`current file = ${m.context.fileName}`);
  if (known.length) lines.push('', `Detected from the request: ${known.join('; ')}.`);
  if (m.notes?.length) {
    lines.push('', 'NOTES for this kind of project (use what fits, in your own words; leave out what does not apply):', ...m.notes.map((n) => `- ${n}`));
  }
  lines.push(
    '',
    '<user_request>',
    m.text,
    '</user_request>',
    '',
    `Now write the prompt for ${m.profile.label}, in this approach. About ${m.budget} words (not counting pasted code or data). Use every detail the user gave and add what a strong version needs.`,
  );
  return lines.join('\n');
}

function userPrompt(m: MetaPromptInput): string {
  if (isRich(m)) return richUserPrompt(m);
  const t = m.template;
  const lines: string[] = [];
  lines.push(`Task type: ${m.intent}${t.role ? ` — the AI should act as ${t.role}` : ''}.`);
  if (m.intent !== 'image') {
    lines.push(`APPROACH — ${m.strategy.name}: ${m.strategy.instruction}`);
    lines.push('The approach decides how the prompt works; the target layout decides how it is laid out. Do both.');
  }
  const layout = m.strategy.skeleton ?? t.sections;
  if (m.intent !== 'image') {
    const max = m.strategy.skeleton ? layout.length : maxSections(m.budget, t.sections.length);
    lines.push(
      m.strategy.skeleton
        ? 'Use EXACTLY these sections, in this order, each with its own heading or tag, headings written in normal Title Case. The approach lives in them, so do not drop or merge any:'
        : max < t.sections.length
          ? `Possible sections — use at most ${max}, merging or skipping the rest (never drop a user detail):`
          : 'Sections to cover (merge or skip any that would be empty):',
    );
    for (const s of layout) lines.push(`- ${s.key}: ${s.guidance}`);
    if (t.bestPractice.length && m.style !== 'concise' && m.budget >= 150) {
      lines.push('Good-practice instructions you may add (process only, no new facts):');
      for (const b of t.bestPractice) lines.push(`- ${b}`);
    }
    lines.push(`If the user named no output format, use: ${t.defaultOutput}`);
  }
  lines.push(`Style: ${m.style}.`);

  const known: string[] = [];
  if (m.slots.audience) known.push(`audience = ${m.slots.audience}`);
  if (m.slots.tone) known.push(`tone = ${m.slots.tone}`);
  if (m.slots.length) known.push(`length = ${m.slots.length}`);
  if (m.slots.format) known.push(`format = ${m.slots.format}`);
  if (m.slots.tech.length) known.push(`tech = ${m.slots.tech.join(', ')}`);
  if (m.context?.languageId) known.push(`editor language = ${m.context.languageId}`);
  if (m.context?.fileName) known.push(`current file = ${m.context.fileName}`);
  if (known.length) lines.push(`Detected from the request: ${known.join('; ')}.`);

  if (m.missing.length && m.style !== 'concise') {
    const ph = m.missing.map((k) => t.placeholders[k]).filter(Boolean);
    if (ph.length) lines.push(`Not stated by the user (use placeholders if they matter): ${ph.join(', ')}.`);
  }
  if (m.askQuestions && m.missing.length && m.style !== 'concise' && m.strategy.id !== 'interview') {
    lines.push('End the prompt with one line telling the AI to ask up to 3 short clarifying questions if key details are missing, otherwise to state assumptions and proceed.');
  }
  if (m.alreadyStructured) {
    lines.push('The request is already a fairly well-structured prompt: make light, targeted improvements and keep its structure.');
  }

  lines.push(
    '',
    '<user_request>',
    m.text,
    '</user_request>',
    '',
    `Now write the improved prompt for ${m.profile.label}. Hard limit: ${m.budget} words (not counting pasted code or data). Short and complete beats long and generic: keep every detail the user gave, cut generic advice first.`,
  );
  return lines.join('\n');
}

export function buildMetaPrompt(m: MetaPromptInput): ChatMessage[] {
  const focus = m.angle
    ? `\n\nFOCUS FOR THIS VERSION: ${m.angle.name}. ${m.angle.focus} Let this focus shape the roles, the sections, the priorities and the first step, so this prompt is clearly different from a standard version, and include a short section about it (${m.angle.points.join(' ')}).`
    : '';
  return [
    { role: 'system', content: systemPrompt(m) },
    { role: 'user', content: userPrompt(m) + focus },
  ];
}

/** Follow-up turn asking the model to fix specific validation problems. */
export function buildRepairMessages(base: ChatMessage[], draft: string, issues: ValidationIssue[]): ChatMessage[] {
  return [
    ...base,
    { role: 'assistant', content: draft },
    {
      role: 'user',
      content: [
        'That prompt has problems:',
        ...issues.map((i) => `- ${i.message}`),
        ...(issues.some((i) => i.code === 'too-long')
          ? ['To shorten: merge sections, drop generic advice and filler, but keep every detail the user gave.']
          : []),
        '',
        'Rewrite it fixing every problem. Output ONLY the corrected prompt.',
      ].join('\n'),
    },
  ];
}
