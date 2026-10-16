import type { Provider } from '@promptforge/providers';
import type { Intent } from './types.js';

export const INTENT_LIST: Intent[] = [
  'coding', 'debugging', 'writing', 'email', 'research', 'analysis', 'learning', 'brainstorming', 'image', 'agent', 'other',
];

const MEANING: Record<Intent, string> = {
  coding: 'write or change code, a script, a query or a formula',
  debugging: 'fix an error, bug or something that misbehaves',
  writing: 'write or edit text (essay, caption, bio, rewrite)',
  email: 'write an email or a message to a person',
  research: 'find current facts, sources, news or compare options',
  analysis: 'interpret data or numbers the user gives',
  learning: 'explain or teach a concept',
  brainstorming: 'generate ideas, names or options',
  image: 'create a picture, logo or illustration',
  agent: 'set up an automated or recurring workflow',
  other: 'anything else (plans, advice, lists, conversions)',
};

/** Reads the model's one-word answer; returns undefined unless it names exactly one known intent. */
export function parseIntent(raw: string): Intent | undefined {
  const words: string[] = raw.toLowerCase().match(/[a-z]+/g) ?? [];
  const hits = INTENT_LIST.filter((i) => words.includes(i));
  return hits.length === 1 ? hits[0] : undefined;
}

/**
 * Asks the model what the user wants to DO, with the rules' guess as a hint. Keyword rules latch onto
 * surface words ("discount code" → coding); a model reads the sentence. Any failure returns undefined,
 * so the caller keeps the rules' answer.
 */
export async function confirmIntent(
  provider: Provider,
  text: string,
  guess: Intent,
  opts: { model?: string; signal?: AbortSignal } = {},
): Promise<Intent | undefined> {
  const system = [
    'You label what a user is asking an AI to do. Answer with exactly one word from this list, nothing else:',
    ...INTENT_LIST.map((i) => `${i}: ${MEANING[i]}`),
    'Judge the overall request, not single words: the topic or tools mentioned are not the task.',
  ].join('\n');
  const user = `Request:\n"""\n${text.slice(0, 1200)}\n"""\nA keyword matcher guessed "${guess}"; it is often wrong. One word:`;
  try {
    const raw = await provider.generate({
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      model: opts.model,
      temperature: 0,
      maxTokens: 8,
      signal: opts.signal,
    });
    return parseIntent(raw);
  } catch (err) {
    if (opts.signal?.aborted) throw err;
    return undefined;
  }
}
