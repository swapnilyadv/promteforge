import type { ChatMessage } from '@promptforge/providers';
import type { ModelProfile } from './profiles/index.js';
import type { IntentTemplate } from './templates.js';
import type { ConvertContext, Intent, Slots, Style, ValidationIssue } from './types.js';

export const META_PROMPT_VERSION = 2;

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
}

function systemPrompt(m: MetaPromptInput): string {
  const lang = LANG_NAMES[m.language] ?? 'the same language as the user';
  return [
    `You are PromptForge, a world-class prompt engineer. You rewrite a user's rough request into the best possible prompt for ${m.profile.label}.`,
    '',
    'NON-NEGOTIABLE RULES',
    "1. Preserve meaning: keep every goal, fact, name, number, constraint and preference the user gave. Do not drop any of them.",
    '2. Never invent specifics the user did not give (names, numbers, tech choices, data, deadlines). Where a missing detail matters, insert a short bracketed placeholder like [target audience].',
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

function userPrompt(m: MetaPromptInput): string {
  const t = m.template;
  const lines: string[] = [];
  lines.push(`Task type: ${m.intent}${t.role ? ` — the AI should act as ${t.role}` : ''}.`);
  if (m.intent !== 'image') {
    const max = maxSections(m.budget, t.sections.length);
    lines.push(
      max < t.sections.length
        ? `Possible sections — use at most ${max}, merging or skipping the rest (never drop a user detail):`
        : 'Sections to cover (merge or skip any that would be empty):',
    );
    for (const s of t.sections) lines.push(`- ${s.key}: ${s.guidance}`);
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
  if (m.askQuestions && m.missing.length && m.style !== 'concise') {
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
  return [
    { role: 'system', content: systemPrompt(m) },
    { role: 'user', content: userPrompt(m) },
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
