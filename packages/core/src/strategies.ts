/**
 * Different ways to build a prompt for the same request. Asking again moves to the next one, so the user gets a
 * genuinely different prompt each time, like asking a chat model twice. All approaches start from the user's own
 * words; they differ in what the finished prompt asks the AI to do.
 *
 * The rich approaches expand a short idea into the prompt an expert would write (a full spec, a co-founder
 * brief...). `brief` is the compact, strict one: it adds nothing the user did not say.
 */
export type StrategyId = 'spec' | 'cofounder' | 'stepwise' | 'interview' | 'expert' | 'critique' | 'brief';

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
  /** Rich approaches expand the idea with what a strong version needs. `brief` does not. */
  rich: boolean;
  /** For brief: rough share of extra words against the plain budget. Rich approaches use `wordBudget`. */
  extraWords: number;
  /** Rich approaches: target length in words at the "balanced" length setting. */
  wordBudget?: number;
  /** Written as flowing first-person prose with labelled bullets, not as headed sections. */
  prose?: boolean;
  /**
   * The parts this approach needs, used instead of the task template's. Small models follow a required
   * layout far better than a description of an approach, so each approach is a different layout.
   */
  skeleton?: { key: string; guidance: string }[];
  /** A finished prompt in this style, about a different project, shown to the model as the quality bar. */
  exemplar?: string;
}

const SPEC_EXEMPLAR = `Prompt: Build a Neighbourhood Home-Cooked Meals App

Act as a senior product manager, full-stack developer, UI/UX designer, and food-business advisor.

I want to build an app where people can order home-cooked meals from cooks in their own neighbourhood. I want a real platform that I can launch locally and grow.

1. Goal
Help me build a trustworthy, easy-to-use marketplace that connects home cooks with nearby customers, with its own brand and look.

2. Core features
* Sign-up and login for customers and cooks, with profiles.
* Cook pages with menus, photos, prices, and weekly availability.
* Search by distance, cuisine, diet, and price, with filters and sorting.
* Cart, checkout, order tracking, and ratings and reviews.

3. Cook dashboard
* Create and edit dishes and daily menus.
* Accept or decline orders, and mark them ready.
* See earnings and payout history.

4. Technology
Recommend a suitable modern stack and explain the best choices for a beginner building a real product. Consider:
* App: React Native or Flutter.
* Backend: Node.js or another suitable solution.
* Database: PostgreSQL or Supabase.
* Authentication: Secure user authentication.
* Payments: Stripe or another suitable payment gateway for my country.
* Maps: Google Maps or Mapbox.
* Hosting: Vercel, Railway, or another suitable platform.

5. Design requirements
* Warm, appetising visuals and a clean layout.
* Fast loading and excellent mobile usability.
* Checkout in as few steps as possible.

6. Development approach
Phase 1: Requirements, architecture, and database design.
Phase 2: UI design and the main screens.
Phase 3: Accounts, menus, cart, and checkout.
Phase 4: Payments, orders, and notifications.
Phase 5: Cook dashboard and reports.
Phase 6: Testing, security, and launch.

7. Important instructions
* Help me build a working product, not only theory.
* Give complete code files with their paths and the setup commands.
* Keep API keys and secrets out of the frontend.
* Include validation, error handling, security, and tests.
* Use realistic sample data while developing.

First task
Before writing any code, ask me the essential questions about my city, budget, target customers, and whether I want a website, a mobile app, or both. Then recommend the best affordable architecture and a practical roadmap, starting with an MVP I can launch.`;

const COFOUNDER_EXEMPLAR = `I want to build my own online fitness coaching business, inspired by the way popular coaching apps work.
Act as my technical co-founder, product strategist, and expert full-stack developer.
My goal is to coach clients remotely through a platform that I own and control.
I want you to help me build a complete application that includes:

* **Client experience:** A welcoming homepage, programme pages, sign-up, a personal dashboard, workout plans, progress tracking, and messaging with me.
* **Coach tools:** An admin area to create programmes, manage clients, track check-ins, and see revenue.
* **Payments:** Subscriptions and one-off payments through the common methods in my country.
* **Brand identity:** A distinctive name, logo direction, colour palette, and a modern, motivating look.
* **Technology:** The best affordable stack for something secure, scalable, and ready for real users.
* **Future growth:** A foundation I can extend with group programmes, video content, and Android and iOS apps.

I don't want a basic demo or a static website. I want a real business platform that can serve hundreds of paying clients.
Work with me step by step. First understand my vision and budget, then plan the architecture, design the interface, build the frontend and backend, connect the database, test everything, and guide me through deployment.
Important: don't generate the whole project in one response. Work in stages, explain your decisions in simple language, and give working code with clear file paths.
Start by helping me define the business model and the first version of the application.`;

/** Order matters: the first is what the apps use for a first Forge; "Another way" walks down the list. */
export const STRATEGIES: Strategy[] = [
  {
    id: 'spec',
    name: 'Full project spec',
    blurb: 'Several expert roles, numbered sections, features, stack options, phases and a first task.',
    instruction:
      'Write a complete, thorough specification prompt, the kind an expert prompt engineer writes for a serious project. Use each section heading exactly as written before its colon below (without the word "section"). Adapt to the kind of task (a build, a document, an analysis, a plan): drop a section that does not apply, but keep the numbered, detailed style.',
    temperature: 0.5,
    rich: true,
    extraWords: 1,
    wordBudget: 650,
    skeleton: [
      { key: 'title', guidance: 'One line starting with "Prompt:" that names the project or task.' },
      { key: 'roles', guidance: '"Act as" followed by 3 or 4 expert roles this task needs.' },
      { key: 'overview', guidance: 'Two or three sentences in the first person: what I want and for whom, using every detail I gave.' },
      { key: '1. Goal', guidance: 'The goal and what success looks like.' },
      { key: '2. Core features', guidance: 'Grouped bullets of what the result must do or contain. Include the features a strong version of this task normally has, not only the ones I mentioned. (For a non-software task, call this section Requirements.)' },
      { key: '3. Admin dashboard', guidance: 'What the owner or admin must be able to do, as bullets. Skip this section if the task has no such side.' },
      { key: '4. Technology', guidance: 'Ask the AI to recommend a suitable modern stack for a beginner building something real. Then list concrete options to consider as bullets, one per layer (for example frontend, backend, database, authentication, payments, storage, hosting), each with 2 or 3 named options that suit my situation. Never fix a choice for me. (For a non-software task, call this section Method.)' },
      { key: '5. Design requirements', guidance: 'Bullets on look, feel and usability, or on tone and quality for a non-visual task.' },
      { key: '6. Business requirements', guidance: 'Requirements that follow from clues in my request (a named country, company, currency, language, regulation, device): for example prices and payments in the right currency and methods, local rules, delivery and taxes. If there are no clues, skip this section.' },
      { key: '7. Development approach', guidance: 'Numbered phases from planning to launch, each with one line on its deliverable.' },
      { key: '8. Important instructions', guidance: 'Bullets: help me build something working, not theory; complete files with paths; setup steps; security; testing; realistic sample data; keep it extensible.' },
      { key: 'First task', guidance: 'Tell the AI to ask me the essential questions (budget, audience, preferences, platforms) before it writes anything, then recommend an affordable architecture and a practical roadmap, starting with a launchable first version.' },
    ],
    exemplar: SPEC_EXEMPLAR,
  },
  {
    id: 'cofounder',
    name: 'Co-founder brief',
    blurb: 'First person: who the AI should be, what I want in labelled bullets, what I do not want, how to work with me.',
    instruction:
      'Write a first-person brief that makes the AI a true partner. Warm, direct, and specific, with no numbered section headings: flowing sentences plus one bulleted list whose bullets start with a bold label.',
    temperature: 0.6,
    rich: true,
    extraWords: 1,
    wordBudget: 300,
    prose: true,
    skeleton: [
      { key: 'opening', guidance: 'Two sentences in the first person: what I want to achieve, inspired by anything I named.' },
      { key: 'role', guidance: 'One line: "Act as my" plus the partner roles the AI should play (for example technical co-founder, strategist, expert developer).' },
      { key: 'goal', guidance: 'One sentence on my goal and what I want to own or control.' },
      { key: 'wants', guidance: 'A bulleted list. Each bullet starts with a bold label and a colon (like **Customer experience:**) then one sentence of specifics. 5 to 7 bullets covering everything this needs, including parts I did not mention that it plainly needs.' },
      { key: 'not_wanted', guidance: 'Two sentences: "I don\'t want ...; I want ..." pushing for a real, lasting result instead of a demo or a shortcut.' },
      { key: 'how_to_work', guidance: 'Ask the AI to work with me step by step: first understand my vision and limits, then plan, then build, test and deliver, in stages and not one giant answer, explaining in simple language, with working output and clear file paths where code is involved.' },
      { key: 'start', guidance: 'One closing sentence saying exactly where to start.' },
    ],
    exemplar: COFOUNDER_EXEMPLAR,
  },
  {
    id: 'stepwise',
    name: 'Roadmap in phases',
    blurb: 'Works in phases with a deliverable and a check at the end of each.',
    instruction:
      'Make the AI work in clear, numbered phases, each with a deliverable and a check that it is done before moving on.',
    temperature: 0.5,
    rich: true,
    extraWords: 1,
    wordBudget: 450,
    skeleton: [
      { key: 'Goal', guidance: 'What I want, in two sentences, using every detail I gave.' },
      { key: 'Context', guidance: 'What is known from my request, and the sensible assumptions to start with (marked as assumptions).' },
      { key: 'Phases', guidance: '5 or 6 numbered phases from understanding to delivery. For each: one line on what to do, one line on what the deliverable is, and one line on the check that proves it is done.' },
      { key: 'Working rules', guidance: 'Bullets: finish a phase before starting the next, state assumptions, give working output, keep explanations simple.' },
      { key: 'First step', guidance: 'What to do first, and the questions to ask me before phase 1.' },
    ],
  },
  {
    id: 'interview',
    name: 'Ask me first',
    blurb: 'The AI asks the questions that matter before it starts.',
    instruction:
      'Make the AI interview me first, with sharp, specific questions, and only then do the work.',
    temperature: 0.5,
    rich: true,
    extraWords: 1,
    wordBudget: 330,
    skeleton: [
      { key: 'Context', guidance: 'Everything I already told you, so the AI does not ask for it again, in two or three sentences.' },
      { key: 'Instruction', guidance: 'The instruction itself, written to the AI in the first person, for example: "Do not start yet. First ask me the questions below, wait for my answers, then do the work."' },
      { key: 'Questions', guidance: '6 to 8 numbered questions grouped by theme (goal, audience, scope, constraints, budget or time, what success looks like). Specific to this request, never generic.' },
      { key: 'After my answers', guidance: 'What to produce once I answer, and how to work with me from there (in stages, in simple language).' },
    ],
  },
  {
    id: 'expert',
    name: 'Expert persona',
    blurb: 'A specific senior expert is briefed like a colleague: what great looks like, trade-offs, deliverable.',
    instruction:
      'Give the AI a specific senior expert role that fits this exact task, then brief that expert like a colleague.',
    temperature: 0.5,
    rich: true,
    extraWords: 1,
    wordBudget: 420,
    skeleton: [
      { key: 'Role', guidance: 'Start with "Act as" and give the AI a specific senior expert role fitted to this task, in one or two sentences: what that person has done many times, not just a job title. Written to the AI, never in the first person.' },
      { key: 'Goal', guidance: 'What I want, in two sentences, using every detail I gave.' },
      { key: 'Context', guidance: 'What is known from my request. Add an assumption only when it is needed, and mark it clearly as an assumption.' },
      { key: 'What great looks like', guidance: '4 to 6 bullets describing an excellent result for this kind of task.' },
      { key: 'Trade-offs', guidance: '3 or 4 decisions the expert must weigh, as short bullets.' },
      { key: 'Deliverable', guidance: 'Exactly what to hand back, in what format and order.' },
    ],
  },
  {
    id: 'critique',
    name: 'Draft, then critique',
    blurb: 'Writes a first draft, critiques it against a checklist, then delivers the improved version.',
    instruction:
      'Make the AI produce a draft, critique it against a concrete checklist, then deliver an improved final version.',
    temperature: 0.5,
    rich: true,
    extraWords: 1,
    wordBudget: 420,
    skeleton: [
      { key: 'Goal', guidance: 'What I want, in two sentences, using every detail I gave.' },
      { key: 'Requirements', guidance: 'What the result must contain, as bullets, including what this kind of task normally needs.' },
      { key: 'Process', guidance: 'Three numbered steps: 1) write a first draft, 2) critique it against the checklist, 3) deliver an improved final version and say what changed.' },
      { key: 'Checklist', guidance: '5 to 7 concrete checks that this kind of task usually fails.' },
      { key: 'Output', guidance: 'Exactly what to hand back.' },
    ],
  },
  {
    id: 'brief',
    name: 'Short and sharp',
    blurb: 'A compact brief: task, context, requirements, output. Adds nothing you did not say.',
    instruction:
      'Write a tight, direct brief: the task first, then the context, the requirements and the exact output format. No role-play and no filler.',
    temperature: 0.2,
    rich: false,
    extraWords: 1,
  },
];

/** What the apps use for a first Forge when a model is connected: the best fit for the request (see autoStrategy). */
export const APP_DEFAULT_STRATEGY = 'auto' as const;
/** The strict, compact one: what the engine uses when nothing is chosen (and what the evals measure). */
export const DEFAULT_STRATEGY: StrategyId = 'brief';

export function getStrategy(id: StrategyId | undefined): Strategy {
  return STRATEGIES.find((s) => s.id === (id ?? DEFAULT_STRATEGY)) ?? STRATEGIES.find((s) => s.id === DEFAULT_STRATEGY)!;
}

/** A project to build (an app, a website, a business) gets the project styles; everything else gets the general ones. */
export type RequestKind = 'project' | 'task';

const BUILD = /\b(build|building|builddd*|create|make|develop|design|launch|start|code|program)\b[^.\n]{0,70}\b(apps?|applications?|web ?sites?|web ?apps?|platforms?|systems?|software|games?|bots?|tools?|apis?|stores?|shops?|e-?commerce|startups?|business(es)?|saas|dashboards?|portals?|marketplaces?|extensions?|plugins?|backends?|frontends?|crm|erp|landing pages?)\b/i;
const NOT_PROJECT_INTENTS = new Set(['learning', 'email', 'writing', 'research', 'analysis', 'brainstorming', 'debugging', 'image']);

/** Is this something to build (so a full spec makes sense), or a task (an email, a question, a fix)? */
export function requestKind(text: string, intent: string): RequestKind {
  if (intent === 'agent') return 'project';
  return BUILD.test(text) && !NOT_PROJECT_INTENTS.has(intent) ? 'project' : 'task';
}

/** The approach "auto" picks: the full spec for a project, a phased plan for a bug, an expert brief otherwise. */
export function autoStrategy(kind: RequestKind, intent: string): StrategyId {
  if (kind === 'project') return 'spec';
  return intent === 'debugging' ? 'stepwise' : 'expert';
}

const PROJECT_ONLY: StrategyId[] = ['spec', 'cofounder'];

/** The strategy after `current`, wrapping around. A plain task skips the project-only styles. */
export function nextStrategy(current?: StrategyId, kind: RequestKind = 'project'): StrategyId {
  const pool = STRATEGIES.filter((s) => kind === 'project' || !PROJECT_ONLY.includes(s.id));
  const i = pool.findIndex((s) => s.id === current);
  return pool[(i + 1) % pool.length]!.id;
}

/** Longer or shorter prompts for the length setting. */
export const STYLE_FACTOR = { concise: 0.55, balanced: 1, detailed: 1.4 } as const;

/**
 * Rules-based version of an approach, for when no model is connected: one extra section in the target's own
 * layout. Plainer than a model's rewrite (only a model can add the domain detail), but each approach still
 * changes what the prompt asks the AI to do.
 */
const OFFLINE_APPROACH: Record<Exclude<StrategyId, 'brief'>, string> = {
  spec: 'Before writing anything, ask me the essential questions about my situation, budget and goals. Then recommend the best affordable approach and a practical roadmap, starting with a first version I can launch and improve.',
  cofounder:
    'Work with me as my partner, step by step and in stages, not in one giant answer. First understand my vision and limits, then plan, build, test and deliver, explaining your decisions in simple language and giving working output with clear file paths.',
  stepwise:
    'Work in phases: 1) restate the goal and your assumptions, 2) make a short plan, 3) carry it out part by part, 4) check the result against every requirement above and fix any gap. Finish each phase before starting the next.',
  interview:
    'Do not start yet. First ask the 4 to 6 questions whose answers would change the result most (audience, scope, constraints, what success looks like), numbered. Wait for my answers.',
  expert:
    'Answer as a senior practitioner who has done this many times: say what you would do first, what you would avoid, and why, then deliver the result.',
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
