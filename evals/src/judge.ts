import type { Provider } from '@promptforge/providers';

export interface JudgeVerdict {
  /** 'prompt' = engineered prompt won, 'original' = the user's raw text won, 'tie'. */
  winner: 'prompt' | 'original' | 'tie';
  reason: string;
}

const SYSTEM = `You are a strict, impartial judge of prompts written for AI assistants.
You will see a USER'S GOAL context, then two candidate prompts, A and B, for the same goal and the same target AI.
Pick the prompt that would make the target AI produce the more useful, accurate, on-target answer.
Reward: clear task, relevant context kept, explicit constraints, sensible output format, structure the target AI follows well.
Penalise: lost or changed user details, invented facts, padding, wrong format for the target.
Do not prefer a prompt because it is longer.
First compare them: name one concrete thing each prompt does well or loses (a kept or dropped detail, a constraint, the format), then decide. Judge the content, never the position: A and B are in random order.
Answer ONLY with JSON, the reason BEFORE the verdict: {"reason":"<two short sentences comparing A and B>","winner":"A"|"B"|"tie"}`;

/**
 * Blind pairwise judge. Order is randomised per call so position bias can't favour the engine.
 * Returns undefined when the judge output can't be parsed.
 */
export async function judgePair(
  judge: Provider,
  targetLabel: string,
  original: string,
  engineered: string,
  rng: () => number = Math.random,
): Promise<JudgeVerdict | undefined> {
  const engineeredIsA = rng() < 0.5;
  const a = engineeredIsA ? engineered : original;
  const b = engineeredIsA ? original : engineered;
  const user = [
    `Target AI: ${targetLabel}`,
    '',
    '=== PROMPT A ===',
    a,
    '',
    '=== PROMPT B ===',
    b,
    '',
    'Which prompt is better? JSON only.',
  ].join('\n');

  const raw = await judge.generate({
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: user },
    ],
    temperature: 0,
    maxTokens: 300,
  });
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) return undefined;
  try {
    const j = JSON.parse(m[0]) as { winner?: string; reason?: string };
    const w = (j.winner ?? '').toUpperCase();
    if (w === 'TIE') return { winner: 'tie', reason: j.reason ?? '' };
    if (w !== 'A' && w !== 'B') return undefined;
    const aWon = w === 'A';
    return { winner: aWon === engineeredIsA ? 'prompt' : 'original', reason: j.reason ?? '' };
  } catch {
    return undefined;
  }
}
