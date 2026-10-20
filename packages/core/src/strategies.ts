/**
 * Different ways to build a prompt for the same request. The first Forge uses `brief`; asking again moves to
 * the next one, so the user gets a genuinely different prompt each time, like asking a chat model twice.
 * The target's layout (XML for Claude, Markdown for ChatGPT...) stays the same; the strategy changes how the
 * prompt works.
 */
export type StrategyId = 'brief' | 'expert' | 'stepwise' | 'interview' | 'example' | 'critique';

export interface Strategy {
  id: StrategyId;
  /** Short name shown to the user. */
  name: string;
  /** One line on what this approach does. */
  blurb: string;
  /** Instruction for the rewriting model. */
  instruction: string;
  /** Sampling temperature: the plain brief stays steady, the others are allowed to vary. */
  temperature: number;
  /** Rough share of extra words this approach needs against the plain brief. */
  extraWords: number;
  /**
   * The sections this approach needs, used instead of the task template's. Small models follow a required
   * layout far better than a description of an approach, so each approach is a different layout.
   */
  skeleton?: { key: string; guidance: string }[];
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'brief',
    name: 'Clear brief',
    blurb: 'Task first, then context, requirements and output format.',
    instruction:
      'Write a tight, direct brief: the task first, then the context, the requirements and the exact output format. No role-play and no filler.',
    temperature: 0.2,
    extraWords: 1,
  },
  {
    id: 'expert',
    name: 'Expert persona',
    blurb: 'Hands the task to a specific senior expert and briefs them like a colleague.',
    instruction:
      'Open by giving the AI a specific senior expert role that fits this exact task (name what that person has done many times, not just a job title). Then brief that expert like a colleague: the context, what a great result looks like, the trade-offs to weigh, and what to deliver.',
    temperature: 0.5,
    extraWords: 1.8,
    skeleton: [
      { key: 'role', guidance: 'One or two sentences giving the AI a specific senior expert role that fits this exact task: what that person has done many times.' },
      { key: 'goal', guidance: 'What the user wants, in one or two sentences, in clean wording.' },
      { key: 'context', guidance: 'Only what the user told us. Placeholders for what is missing.' },
      { key: 'what_great_looks_like', guidance: '3 to 4 bullets describing an excellent result for this task.' },
      { key: 'trade_offs', guidance: '2 or 3 decisions the expert must weigh, as short bullets.' },
      { key: 'deliverable', guidance: 'Exactly what to hand back.' },
    ],
  },
  {
    id: 'stepwise',
    name: 'Step by step',
    blurb: 'Works in phases: restate, plan, do, then check against the requirements.',
    instruction:
      'Tell the AI to work in numbered phases, each with a clear deliverable: (1) restate the goal and list its assumptions, (2) make a short plan, (3) carry out the plan part by part, (4) check the result against every requirement and fix gaps.',
    temperature: 0.5,
    extraWords: 1.7,
    skeleton: [
      { key: 'goal', guidance: 'What the user wants, in one or two sentences.' },
      { key: 'requirements', guidance: 'What the user asked for, as short bullets.' },
      { key: 'phases', guidance: 'Exactly four numbered phases, ONE line each, saying what the AI delivers in that phase: 1) restate the goal and list assumptions, 2) make a short plan, 3) carry out the plan part by part, 4) check the result against every requirement and fix gaps. Do not expand the phases into sub-steps.' },
      { key: 'done_when', guidance: '2 or 3 checks that prove the work is finished.' },
    ],
  },
  {
    id: 'interview',
    name: 'Ask me first',
    blurb: 'The AI asks the questions that matter before it starts.',
    instruction:
      'Tell the AI not to start the work yet. First it must ask 4 to 6 sharp, numbered questions whose answers would change the result most (audience, scope, constraints, what success looks like), then wait for the answers. Put everything the user already told us in the prompt as context, so the AI does not ask for it again.',
    temperature: 0.5,
    extraWords: 1.5,
    skeleton: [
      { key: 'context', guidance: 'Everything the user already told us, so the AI does not ask for it again. Placeholders for what is missing.' },
      { key: 'instruction', guidance: 'The instruction itself, written to the AI in the first person, for example: "Do not start the work yet. First ask me the questions below, wait for my answers, and only then do the work."' },
      { key: 'questions', guidance: '4 to 6 numbered, sharp questions whose answers would change the result most (audience, scope, constraints, what success looks like). Not generic.' },
      { key: 'after_answers', guidance: 'One or two sentences on what to produce once the answers arrive.' },
    ],
  },
  {
    id: 'example',
    name: 'Show an example',
    blurb: 'Sets the quality bar with a short sample and a mistake to avoid.',
    instruction:
      'Set the quality bar with a short sample: add a "what good looks like" example showing the shape of the expected output (a few lines, clearly marked as illustrative so the AI does not copy it), and name one common mistake to avoid.',
    temperature: 0.6,
    extraWords: 1.6,
    skeleton: [
      { key: 'goal', guidance: 'What the user wants, in one or two sentences.' },
      { key: 'requirements', guidance: 'What the user asked for, as short bullets.' },
      { key: 'what_good_looks_like', guidance: 'A short outline, a few lines, of the shape of an excellent result, in plain words. Mark it clearly as an illustrative example. Do not write code in a language the user did not name.' },
      { key: 'avoid', guidance: 'One common mistake to avoid for this kind of task.' },
      { key: 'output', guidance: 'Exactly what to hand back.' },
    ],
  },
  {
    id: 'critique',
    name: 'Draft, then critique',
    blurb: 'Writes a first draft, critiques it, then delivers the improved version.',
    instruction:
      'Tell the AI to produce a first draft, then critique it against a short checklist of the weaknesses this kind of task usually has (name 3 to 5 concrete checks), then deliver the improved final version and say what it changed.',
    temperature: 0.5,
    extraWords: 1.8,
    skeleton: [
      { key: 'goal', guidance: 'What the user wants, in one or two sentences.' },
      { key: 'requirements', guidance: 'What the user asked for, as short bullets.' },
      { key: 'process', guidance: 'Three steps: 1) write a first draft, 2) critique it against the checklist, 3) deliver an improved final version and say what changed.' },
      { key: 'checklist', guidance: '3 to 5 concrete checks that this kind of task usually fails.' },
      { key: 'output', guidance: 'Exactly what to hand back.' },
    ],
  },
];

export const DEFAULT_STRATEGY: StrategyId = 'brief';

export function getStrategy(id: StrategyId | undefined): Strategy {
  return STRATEGIES.find((s) => s.id === id) ?? STRATEGIES[0]!;
}

/** The strategy after `current`, wrapping around. With no current one, the second (the first Forge used the first). */
export function nextStrategy(current?: StrategyId): StrategyId {
  const i = STRATEGIES.findIndex((s) => s.id === current);
  return STRATEGIES[(i + 1) % STRATEGIES.length]!.id;
}

/**
 * Rules-based version of an approach, for when no model is connected: one extra section in the target's own
 * layout. Plainer than a model's rewrite, but each approach still changes what the prompt asks the AI to do.
 */
const OFFLINE_APPROACH: Record<Exclude<StrategyId, 'brief'>, string> = {
  expert:
    'Answer as a senior practitioner who has done this many times: say what you would do first, what you would avoid, and why, then deliver the result.',
  stepwise:
    'Work in phases: 1) restate the goal and your assumptions, 2) make a short plan, 3) carry it out part by part, 4) check the result against every requirement above and fix any gap.',
  interview:
    'Do not start yet. First ask the 4 to 6 questions whose answers would change the result most (audience, scope, constraints, what success looks like), numbered. Wait for my answers.',
  example:
    'Before the full answer, show a short sample of the expected shape (mark it as an example, not final) and name one common mistake to avoid.',
  critique:
    'Write a first draft, list its 3 weakest points against the requirements above, then deliver the improved final version and say what you changed.',
};

export function withOfflineApproach(prompt: string, id: StrategyId, structure: string): string {
  if (id === 'brief') return prompt;
  const text = OFFLINE_APPROACH[id];
  const section = structure === 'xml' ? `<approach>\n${text}\n</approach>` : `## Approach\n${text}`;
  // Keep the closing "ask clarifying questions" line last, as in the plain brief.
  const m = prompt.match(/\n\n(Ask up to 3[^\n]*)$/);
  return m ? `${prompt.slice(0, m.index)}\n\n${section}\n\n${m[1]}` : `${prompt}\n\n${section}`;
}
