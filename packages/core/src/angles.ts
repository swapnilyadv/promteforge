import type { RequestKind } from './strategies.js';

/**
 * A focus for one version of the prompt. "Another way" combines the next approach with the next angle, so each
 * press gives a genuinely different prompt (a budget MVP plan, then a premium growth plan, then a security-first
 * roadmap...) and the combinations do not repeat for well over a hundred presses. Users can also pick one.
 */
export interface Angle {
  id: string;
  /** Short name shown to the user. */
  name: string;
  /** Which requests it suits. */
  kind: RequestKind;
  /** One sentence for the prompt (and the model) on what this version prioritises. */
  focus: string;
  /** What that means in practice, as bullets for the rules engine's prompt. */
  points: string[];
}

export const ANGLES: Angle[] = [
  // Projects.
  { id: 'mvp', name: 'Launch fast (MVP)', kind: 'project', focus: 'Get the smallest useful version live in about 30 days, and cut everything else for later.', points: ['List the 3 to 5 features the first version cannot launch without.', 'Move every other idea to a "later" list.', 'Prefer ready-made services over building from scratch.', 'Define what "launched" means and how I will know it works.'] },
  { id: 'budget', name: 'Low budget', kind: 'project', focus: 'Keep the cost as low as possible while it is still good enough to launch.', points: ['Use free tiers, open-source tools and pay-as-you-go hosting.', 'Show the monthly running cost of each choice.', 'Point out where a cheaper option is good enough, and where it is not.', 'Avoid anything that locks me into an expensive plan.'] },
  { id: 'premium', name: 'Premium quality', kind: 'project', focus: 'Aim for a polished, premium result that feels better than the competition.', points: ['Hold the design, speed and details to a premium standard.', 'Suggest the small touches that make customers trust and love it.', 'Include a design system: colours, type, spacing and components.', 'Plan the quality checks before launch.'] },
  { id: 'growth', name: 'Growth and marketing', kind: 'project', focus: 'Plan how to win the first 1,000 customers, not only how to build it.', points: ['Suggest marketing channels that fit my audience (search, social, referrals, partnerships).', 'Build in sharing, referrals and reviews from the start.', 'Plan search-engine optimisation and analytics from day one.', 'Give a simple 90-day launch and growth plan.'] },
  { id: 'scale', name: 'Built to scale', kind: 'project', focus: 'Design it to grow from the first user to 100,000 without a rewrite.', points: ['Choose an architecture and database that scale without a rebuild.', 'Plan caching, background jobs and monitoring.', 'Explain what changes at 1,000, 10,000 and 100,000 users.', 'Keep it simple now, but leave room to grow.'] },
  { id: 'security', name: 'Security and privacy first', kind: 'project', focus: 'Make it secure and trustworthy from the first line of code.', points: ['Cover login, passwords, roles and permissions properly.', 'Protect payments and personal data, and follow the privacy rules that apply.', 'Include backups, logging and a plan for when something goes wrong.', 'List the security checks to run before launch.'] },
  { id: 'beginner', name: 'Teach me as we build', kind: 'project', focus: 'I am a beginner: explain every step in simple words and teach me as we build it together.', points: ['Explain each decision and each new term in plain language.', 'Go one small step at a time and check I understand before moving on.', 'Give me commands to copy and tell me what I should see.', 'Point me to the best free resources for what I am learning.'] },
  { id: 'design', name: 'Design first', kind: 'project', focus: 'Start from the customer experience and the visual design, then build to match it.', points: ['Map the main user journeys before any code.', 'Describe the key screens and wireframes first.', 'Suggest a colour palette, fonts and visual style that fit the brand.', 'Make it accessible and easy to use on any device.'] },
  { id: 'mobile', name: 'Mobile first', kind: 'project', focus: 'Most people will use it on a phone, so design and build for phones first.', points: ['Design every screen for a small screen first.', 'Keep it fast on slow mobile connections.', 'Consider a progressive web app before native apps.', 'Use the phone features that help (camera, location, notifications).'] },
  { id: 'ai', name: 'Smart AI features', kind: 'project', focus: 'Use AI where it genuinely helps my customers, not as a gimmick.', points: ['Suggest 3 to 5 AI features that add real value (search, recommendations, chat, automation).', 'Explain the cost and the privacy side of each.', 'Start with the simplest one that proves its value.', 'Keep a non-AI fallback for every AI feature.'] },
  { id: 'data', name: 'Data and analytics', kind: 'project', focus: 'Decide what to measure from day one, so every decision is based on data.', points: ['Define the key numbers to track (sign-ups, sales, retention).', 'Build an owner dashboard for them.', 'Track events in a privacy-friendly way.', 'Explain how to use the data to improve the product each month.'] },
  { id: 'investor', name: 'Investor ready', kind: 'project', focus: 'Shape it as a business I could pitch: market, model, numbers and roadmap.', points: ['Describe the problem, the market size and the competition.', 'Propose a business model and pricing.', 'Define the metrics investors will ask about.', 'Turn the roadmap into milestones I can pitch.'] },
  { id: 'nocode', name: 'No-code or low-code', kind: 'project', focus: 'Use no-code and low-code tools wherever they do the job, and code only where needed.', points: ['Compare no-code platforms that fit this project.', 'Say clearly what they cannot do and when I would outgrow them.', 'Plan how to move to custom code later if needed.', 'Keep my data portable.'] },
  { id: 'local', name: 'Local market fit', kind: 'project', focus: 'Fit it closely to my local customers: language, payments, habits and rules.', points: ['Support the languages my customers use.', 'Offer the payment and delivery options people expect locally.', 'Follow local tax and legal requirements.', 'Use local examples and pricing.'] },
  { id: 'quality', name: 'Tested and reliable', kind: 'project', focus: 'Make it reliable: clean code, tests and no surprises in production.', points: ['Write tests for every important flow.', 'Set up automatic checks before each release.', 'Handle errors clearly for users and log them for me.', 'Keep the code clean and documented so others can work on it.'] },
  { id: 'speed', name: 'Fast and lightweight', kind: 'project', focus: 'Make it load and respond fast, even on cheap phones and slow networks.', points: ['Set a speed budget for each page.', 'Optimise images, fonts and scripts.', 'Use caching and a CDN.', 'Measure speed before and after each change.'] },
  // Tasks.
  { id: 'concise', name: 'Short and to the point', kind: 'task', focus: 'Keep the answer short: only what matters, no filler.', points: ['Lead with the answer.', 'Use short sentences and bullets.', 'Cut anything that does not help.'] },
  { id: 'deep', name: 'In depth', kind: 'task', focus: 'Go deep: cover the details, the reasons and the edge cases.', points: ['Explain the why, not only the what.', 'Cover the edge cases and common mistakes.', 'End with a short summary.'] },
  { id: 'examples', name: 'With examples', kind: 'task', focus: 'Use concrete examples throughout, so every point is easy to picture.', points: ['Give at least one real example per point.', 'Use examples close to my situation.', 'Show a before and after where it helps.'] },
  { id: 'steps', name: 'Step by step', kind: 'task', focus: 'Turn it into clear, numbered steps I can follow one by one.', points: ['Number every step.', 'Say what I should see after each step.', 'Flag the steps where people usually go wrong.'] },
  { id: 'simple', name: 'Explain simply', kind: 'task', focus: 'Explain it like I am new to this: plain words, no jargon.', points: ['Avoid jargon, or explain it the first time.', 'Use an everyday analogy.', 'Check understanding with a quick question at the end.'] },
  { id: 'expert-level', name: 'Expert level', kind: 'task', focus: 'Answer at an expert level: precise, technical and complete.', points: ['Use the correct technical terms.', 'Mention trade-offs and alternatives.', 'Cite standards or sources where relevant.'] },
  { id: 'formal', name: 'Formal and professional', kind: 'task', focus: 'Make the tone formal and professional.', points: ['Use a respectful, professional tone.', 'Keep the structure clear and tidy.', 'Avoid slang and emojis.'] },
  { id: 'friendly', name: 'Warm and friendly', kind: 'task', focus: 'Make the tone warm, friendly and human.', points: ['Sound like a helpful person, not a robot.', 'Be positive and encouraging.', 'Keep it natural and easy to read.'] },
  { id: 'persuasive', name: 'Persuasive', kind: 'task', focus: 'Make it persuasive: lead with the benefit and end with a clear call to action.', points: ['Open with what the reader gains.', 'Back each claim with a reason or an example.', 'End with one clear next step.'] },
  { id: 'creative', name: 'Creative and original', kind: 'task', focus: 'Be creative: fresh angles, not the usual answers.', points: ['Avoid the most obvious ideas.', 'Offer at least one bold option.', 'Explain why each idea could work.'] },
  { id: 'facts', name: 'Backed by facts', kind: 'task', focus: 'Back every important point with facts, numbers or sources.', points: ['Include numbers and dates where possible.', 'Name the sources.', 'Say clearly when something is uncertain.'] },
  { id: 'options', name: 'Compare options', kind: 'task', focus: 'Give me several options and compare them, then recommend one.', points: ['Offer 3 options.', 'Compare them in a table: pros, cons, cost, effort.', 'Recommend one and say why.'] },
  { id: 'action', name: 'Action plan', kind: 'task', focus: 'End with a practical action plan I can start today.', points: ['Turn the answer into concrete actions.', 'Put them in order, with time estimates.', 'Mark the first action I should take today.'] },
  { id: 'checklist', name: 'Checklist', kind: 'task', focus: 'Give the result as a checklist I can tick off.', points: ['Use checkbox items.', 'Group them by stage.', 'Keep each item short and specific.'] },
];

/** The extra expert each project angle brings in, so the prompt's voice changes too. */
const ROLE: Record<string, string> = {
  mvp: 'a lean-startup coach who has launched many MVPs',
  budget: 'a cost-conscious startup advisor',
  premium: 'a premium brand and product designer',
  growth: 'a growth marketer who has taken products from zero to their first thousand customers',
  scale: 'a cloud architect who has scaled products to millions of users',
  security: 'a security and privacy engineer',
  beginner: 'a patient teacher who explains everything simply',
  design: 'a senior UX and brand designer',
  mobile: 'a mobile UX specialist',
  ai: 'an AI product engineer',
  data: 'a data and analytics lead',
  investor: 'a startup advisor who prepares founders for investors',
  nocode: 'a no-code and low-code expert',
  local: 'an expert on my local market',
  quality: 'a QA and reliability lead',
  speed: 'a web performance engineer',
};

export function anglesFor(kind: RequestKind): Angle[] {
  return ANGLES.filter((a) => a.kind === kind);
}

export function getAngle(id: string | undefined): Angle | undefined {
  return id ? ANGLES.find((a) => a.id === id) : undefined;
}

/**
 * The angle for the n-th "Another way" (0 = the first prompt, which has none). The approaches cycle every 5 or 7
 * presses and the angles every 14 or 16, so the pairs repeat only after 70 to 112 presses.
 */
export function angleFor(variant: number, kind: RequestKind): Angle | undefined {
  if (!variant || variant < 1) return undefined;
  const list = anglesFor(kind);
  return list[(variant - 1) % list.length];
}

/**
 * Reshapes a prompt around an angle, so "Another way" reads as a new prompt rather than an added paragraph: the
 * title names the focus, an extra expert joins the roles, and the focus comes right after the opening, before the
 * first section.
 */
export function withAngle(prompt: string, angle: Angle, structure: string): string {
  let p = prompt.replace(/^Prompt: (.+)$/m, `Prompt: $1 (${angle.name})`);
  const role = ROLE[angle.id];
  if (role) p = p.replace(/^((?:Act as|You are)\b[^\n]*?)[ \t]*$/m, `$1 Also think like ${role}.`);
  const title = `Focus for This Version: ${angle.name}`;
  const bullets = angle.points.map((x) => `* ${x}`).join('\n');
  const section =
    structure === 'xml'
      ? `<focus name="${angle.name}">\n${angle.focus}\n${bullets}\n</focus>`
      : structure === 'task-first'
        ? `${title}:\n${angle.focus}\n${bullets}`
        : /^## /m.test(p)
          ? `## ${title}\n${angle.focus}\n${bullets}`
          : `${title}\n${angle.focus}\n${bullets}`;
  const blocks = p.split(/\n\n(?=\S)/);
  // Before the first section ("1. Business Goal", "## Goal", "<goal>", "Context:"), or after the opening line.
  const first = blocks.findIndex((b, i) => i > 0 && /^(\d+\.\s|##\s|<[a-z_]+>|[A-Z][A-Za-z ]{2,30}:?\n|\* \*\*)/.test(b));
  let at = first > 0 ? first : Math.min(1, blocks.length);
  // Never between a lead-in ("...that includes:") and its list.
  while (at < blocks.length && /:\s*$/.test(blocks[at - 1] ?? '')) at++;
  return [...blocks.slice(0, at), section, ...blocks.slice(at)].join('\n\n');
}
