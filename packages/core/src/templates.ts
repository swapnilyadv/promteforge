import type { Intent, Slots } from './types.js';

export interface IntentTemplate {
  intent: Intent;
  /** Expert role the target model should take. */
  role: string;
  /** Slots that matter most; missing ones become placeholders or questions. */
  wanted: (keyof Slots)[];
  /** Placeholder text used when a wanted slot is missing. */
  placeholders: Partial<Record<keyof Slots, string>>;
  /** Clarifying question per missing slot. */
  questions: Partial<Record<keyof Slots, string>>;
  /** Process guidance that is always safe to add (never invents facts). */
  bestPractice: string[];
  /** Default deliverable when the user didn't name one. */
  defaultOutput: string;
  /** Sections the rewriting LLM should include, in order, with what each holds. */
  sections: { key: string; guidance: string }[];
}

const T: Record<Intent, IntentTemplate> = {
  coding: {
    intent: 'coding',
    role: 'a senior software engineer who writes clean, production-ready, well-tested code',
    wanted: ['tech', 'constraints', 'format'],
    placeholders: { tech: '[language / framework and version]' },
    questions: {
      tech: 'Which language, framework and versions should it use?',
      format: 'Do you want the full file, a diff, or an explanation first?',
    },
    bestPractice: [
      'Handle errors and edge cases explicitly.',
      'Keep the code modular and easy to extend; when editing existing code, keep unrelated parts unchanged.',
      'Briefly explain key decisions after the code.',
    ],
    defaultOutput: 'Complete, runnable code in fenced code blocks with file names, followed by a short explanation and how to run or test it.',
    sections: [
      { key: 'goal', guidance: 'What to build, in one or two sentences.' },
      { key: 'context', guidance: 'Tech stack, versions, files, existing code.' },
      { key: 'requirements', guidance: 'Numbered functional requirements + edge cases.' },
      { key: 'constraints', guidance: 'Style, dependencies, performance, what not to change.' },
      { key: 'output', guidance: 'Exact deliverable: full file, diff, tests.' },
      { key: 'acceptance', guidance: 'How we know it works.' },
    ],
  },
  debugging: {
    intent: 'debugging',
    role: 'an expert debugger who finds root causes before proposing fixes',
    wanted: ['inputs', 'tech'],
    placeholders: {
      inputs: '[paste the exact error message and the relevant code]',
      tech: '[language / framework and version]',
    },
    questions: {
      inputs: 'Can you paste the exact error message and the code around it?',
      tech: 'What language, framework and versions are you on?',
    },
    bestPractice: [
      'First identify the most likely root cause and explain why it happens.',
      'Then give the minimal fix, then any wider improvements.',
      'If more information is needed, say exactly what to log or check.',
    ],
    defaultOutput: '1) Root cause, 2) the fixed code (minimal diff), 3) how to verify the fix, 4) how to prevent it.',
    sections: [
      { key: 'goal', guidance: 'What is broken.' },
      { key: 'context', guidance: 'Environment, stack, what changed recently, what was tried.' },
      { key: 'behaviour', guidance: 'Expected vs actual behaviour.' },
      { key: 'input', guidance: 'Exact error text and relevant code, verbatim.' },
      { key: 'output', guidance: 'Root cause first, then fix, then verification.' },
    ],
  },
  writing: {
    intent: 'writing',
    role: 'a skilled writer and editor',
    wanted: ['audience', 'tone', 'length'],
    placeholders: {
      audience: '[who will read this]',
      tone: '[tone, e.g. friendly and confident]',
      length: '[length, e.g. ~300 words]',
    },
    questions: {
      audience: 'Who is the audience?',
      tone: 'What tone do you want?',
      length: 'Roughly how long should it be?',
    },
    bestPractice: [
      'Use clear, specific language and avoid clichés and filler.',
      'Keep a consistent voice throughout.',
    ],
    defaultOutput: 'The finished text only, ready to use, with a title if appropriate.',
    sections: [
      { key: 'goal', guidance: 'What to write and its purpose.' },
      { key: 'audience', guidance: 'Who reads it and what they need.' },
      { key: 'requirements', guidance: 'Key points to cover, tone, style, length.' },
      { key: 'output', guidance: 'Format and length.' },
    ],
  },
  email: {
    intent: 'email',
    role: 'a professional communicator who writes clear, effective messages',
    wanted: ['audience', 'tone'],
    placeholders: { audience: '[recipient and relationship]', tone: '[tone]' },
    questions: {
      audience: 'Who is the recipient and what is your relationship?',
      tone: 'What tone — formal, friendly, firm?',
    },
    bestPractice: [
      'Lead with the main point or request in the first two sentences.',
      'End with one clear next step or call to action.',
    ],
    defaultOutput: 'A subject line, then the message body, ready to send. Keep it brief.',
    sections: [
      { key: 'goal', guidance: 'What the message must achieve.' },
      { key: 'audience', guidance: 'Recipient and relationship.' },
      { key: 'requirements', guidance: 'Points to include, tone, length.' },
      { key: 'output', guidance: 'Subject + body.' },
    ],
  },
  research: {
    intent: 'research',
    role: 'a meticulous research analyst',
    wanted: ['constraints', 'format'],
    placeholders: {},
    questions: {
      constraints: 'Any time range, region or type of sources to focus on?',
      format: 'How should the findings be presented (summary, table, report)?',
    },
    bestPractice: [
      'Use reliable, recent sources and cite them with links.',
      'Separate established facts from opinions or estimates, and flag uncertainty.',
      'Note where sources disagree.',
    ],
    defaultOutput: 'A short answer up front, then the supporting findings, then a list of sources.',
    sections: [
      { key: 'goal', guidance: 'The research question.' },
      { key: 'scope', guidance: 'Time range, region, depth, source quality bar.' },
      { key: 'requirements', guidance: 'What to compare or cover.' },
      { key: 'output', guidance: 'Structure + citations.' },
    ],
  },
  analysis: {
    intent: 'analysis',
    role: 'a senior data analyst',
    wanted: ['inputs', 'format'],
    placeholders: { inputs: '[paste or attach the data]' },
    questions: {
      inputs: 'Can you share the data (paste, CSV or file)?',
      format: 'What output do you want — summary, chart, table?',
    },
    bestPractice: [
      'State any assumptions and data-quality issues before the conclusions.',
      'Show the numbers behind each insight.',
      'End with the 3 most important takeaways.',
    ],
    defaultOutput: 'Key findings first, then supporting tables or calculations, then recommendations.',
    sections: [
      { key: 'goal', guidance: 'Question the analysis must answer.' },
      { key: 'input', guidance: 'The data, verbatim.' },
      { key: 'requirements', guidance: 'Metrics, cuts, comparisons.' },
      { key: 'output', guidance: 'Format of findings.' },
    ],
  },
  learning: {
    intent: 'learning',
    role: 'a patient expert teacher',
    wanted: ['audience'],
    placeholders: { audience: '[your current level, e.g. beginner]' },
    questions: { audience: 'What is your current level with this topic?' },
    bestPractice: [
      'Start with a simple intuition, then build up to the details.',
      'Use a concrete example or analogy.',
      'Finish with a short recap and one question to check understanding.',
    ],
    defaultOutput: 'A clear explanation with headings, one worked example, and a short recap.',
    sections: [
      { key: 'goal', guidance: 'What to understand.' },
      { key: 'audience', guidance: 'Learner level and background.' },
      { key: 'requirements', guidance: 'Depth, examples, analogies.' },
      { key: 'output', guidance: 'Structure of the explanation.' },
    ],
  },
  brainstorming: {
    intent: 'brainstorming',
    role: 'a creative strategist',
    wanted: ['audience', 'constraints'],
    placeholders: {},
    questions: {
      audience: 'Who are these ideas for?',
      constraints: 'Any constraints — budget, style, things to avoid?',
    },
    bestPractice: [
      'Give varied ideas, from safe to bold.',
      'Add one line on why each idea could work.',
    ],
    defaultOutput: 'A numbered list of 10 distinct ideas, each with a one-line rationale; mark your top 3.',
    sections: [
      { key: 'goal', guidance: 'What ideas are needed and why.' },
      { key: 'context', guidance: 'Audience, brand, constraints.' },
      { key: 'output', guidance: 'Number of ideas and format.' },
    ],
  },
  image: {
    intent: 'image',
    role: '',
    wanted: [],
    placeholders: {},
    questions: {},
    bestPractice: [],
    defaultOutput: '',
    sections: [{ key: 'description', guidance: 'Single descriptive paragraph + parameters.' }],
  },
  agent: {
    intent: 'agent',
    role: 'a reliable automation agent that plans before acting',
    wanted: ['constraints', 'format'],
    placeholders: {},
    questions: {
      constraints: 'Are there any steps that need your approval first?',
      format: 'What should the final result look like and where should it go?',
    },
    bestPractice: [
      'Plan the steps first and confirm before any irreversible action.',
      'Report what was done and anything that failed.',
    ],
    defaultOutput: 'A short plan, then the result, then a summary of actions taken.',
    sections: [
      { key: 'goal', guidance: 'The outcome to achieve.' },
      { key: 'steps', guidance: 'Ordered steps / workflow.' },
      { key: 'constraints', guidance: 'Limits, approvals, tools.' },
      { key: 'output', guidance: 'Final deliverable + report.' },
    ],
  },
  other: {
    intent: 'other',
    role: 'a knowledgeable expert assistant',
    wanted: ['format'],
    placeholders: {},
    questions: { format: 'What format do you want the answer in?' },
    bestPractice: ['If something is ambiguous, state your assumption briefly and continue.'],
    defaultOutput: 'A clear, well-structured answer.',
    sections: [
      { key: 'goal', guidance: 'The task.' },
      { key: 'context', guidance: 'Relevant background.' },
      { key: 'requirements', guidance: 'Constraints.' },
      { key: 'output', guidance: 'Format.' },
    ],
  },
};

export function getTemplate(intent: Intent): IntentTemplate {
  return T[intent];
}

export const TEMPLATES = T;
