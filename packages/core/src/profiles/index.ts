import type { Target } from '../types.js';

export type Structure = 'xml' | 'markdown' | 'task-first' | 'code' | 'image';

export interface ModelProfile {
  id: Target;
  label: string;
  structure: Structure;
  /** Bumped whenever the rules change, so evals can be compared across versions. */
  version: number;
  /** Prompt-engineering rules for this model family, fed to the rewriting LLM. */
  rules: string[];
  /** One-line description of the target layout, shown to the rewriting LLM. */
  layout: string;
}

const claude: ModelProfile = {
  id: 'claude',
  label: 'Claude',
  structure: 'xml',
  version: 1,
  layout:
    'Plain-language opening line stating the task, then XML-tagged sections such as <context>, <task>, <requirements>, <input>, <output_format>, <examples>. Tags are lowercase snake_case and always closed.',
  rules: [
    'Be clear and direct: state exactly what is wanted, as if briefing a brilliant new colleague who has no context.',
    'Wrap distinct parts in XML tags (<context>, <task>, <requirements>, <input>, <output_format>) so nothing is mixed up.',
    'Explain WHY behind important constraints in a short clause; Claude follows reasons better than bare rules.',
    'Phrase instructions positively ("write in flowing prose") rather than only as prohibitions ("no markdown").',
    'Put long pasted material (documents, code, data) inside <input> or <document> tags BEFORE the final question or task line.',
    'For complex reasoning or analysis, ask Claude to think through the problem before giving the final answer.',
    'Say explicitly what "done" looks like and the exact output format.',
  ],
};

const chatgpt: ModelProfile = {
  id: 'chatgpt',
  label: 'ChatGPT',
  structure: 'markdown',
  version: 1,
  layout:
    'Markdown with short "## " headers: Role, Goal, Context, Requirements (numbered), Input (delimited with triple quotes), Output format.',
  rules: [
    'Open with a one-line role that sets expertise ("You are a senior …").',
    'Use Markdown headers and numbered requirements so each instruction is separate and checkable.',
    'Put pasted material between clear delimiters (""" … """ or ### blocks) and refer to it by name.',
    'Specify the output format and length precisely (e.g. "a table with columns A, B, C", "under 200 words").',
    'Give the model a fallback: what to do when information is missing (ask or state assumptions).',
    'Keep it tight; reasoning models do best with clear goals and constraints rather than "think step by step" instructions.',
  ],
};

const gemini: ModelProfile = {
  id: 'gemini',
  label: 'Gemini',
  structure: 'task-first',
  version: 1,
  layout:
    'Starts with the task in one or two direct sentences, then short labelled sections: Context, Constraints, Format. Few-shot example only when format matters.',
  rules: [
    'Lead with the task itself — a direct, specific instruction — before any background.',
    'Keep sections short and labelled ("Context:", "Constraints:", "Format:"); avoid long preambles.',
    'One clear task per prompt; split unrelated asks.',
    'State the response format and length plainly; add one short example when the shape of the output matters.',
    'Put reference material after the instruction, clearly labelled.',
  ],
};

const code: ModelProfile = {
  id: 'vscode',
  label: 'Coding assistant',
  structure: 'code',
  version: 1,
  layout:
    'Markdown for a coding agent: Goal, Tech & context (language, framework, files), Current behaviour, Expected behaviour / Requirements, Constraints, Deliverable (diff or full file), Acceptance criteria.',
  rules: [
    'Name the language, framework and versions, and the files or functions involved.',
    'Separate current behaviour from expected behaviour; include the exact error text verbatim.',
    'List requirements as checkable bullets, including edge cases and error handling.',
    'Say what to deliver: a minimal diff, full file, or explanation first then code.',
    'Add acceptance criteria / tests that prove it works.',
    'Tell the assistant to keep existing style and not change unrelated code.',
  ],
};

const image: ModelProfile = {
  id: 'image',
  label: 'Image model',
  structure: 'image',
  version: 1,
  layout:
    'One descriptive paragraph (subject, setting, style, composition, lighting, colour palette, mood, detail level) followed by a short line of parameters such as aspect ratio.',
  rules: [
    'Describe the image, do not instruct the model ("a red fox in snow", not "please make").',
    'Order: subject → action → setting → style/medium → composition/camera → lighting → colour → mood.',
    'Use concrete visual words; avoid abstract goals.',
    'End with parameters the user implied (aspect ratio, style references) and a short "avoid:" list if needed.',
  ],
};

const generic: ModelProfile = {
  id: 'generic',
  label: 'Any AI model',
  structure: 'markdown',
  version: 1,
  layout: 'Markdown sections: Role, Task, Context, Requirements, Output format.',
  rules: [
    'State role, task and context explicitly.',
    'List constraints as separate bullets.',
    'Specify the output format and length.',
    'Tell the model how to handle missing information.',
  ],
};

export const PROFILES: Record<Target, ModelProfile> = {
  claude,
  chatgpt,
  gemini,
  vscode: code,
  cursor: { ...code, id: 'cursor', label: 'Cursor' },
  copilot: { ...code, id: 'copilot', label: 'GitHub Copilot' },
  perplexity: {
    ...gemini,
    id: 'perplexity',
    label: 'Perplexity',
    rules: [
      ...gemini.rules,
      'Ask for sources with links and a date range; Perplexity searches the web.',
    ],
  },
  deepseek: { ...chatgpt, id: 'deepseek', label: 'DeepSeek' },
  grok: { ...chatgpt, id: 'grok', label: 'Grok' },
  image,
  generic,
};

export function getProfile(target: Target): ModelProfile {
  return PROFILES[target] ?? generic;
}
