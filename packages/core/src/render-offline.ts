import { proseWords } from './budget.js';
import { getProfile, type ModelProfile } from './profiles/index.js';
import { missingSlots } from './slots.js';
import type { IntentTemplate } from './templates.js';
import type { ConvertContext, Intent, Slots, Style, Target } from './types.js';

export interface RenderInput {
  target: Target;
  intent: Intent;
  style: Style;
  slots: Slots;
  template: IntentTemplate;
  context?: ConvertContext;
  askQuestions: boolean;
  /** 0 = full, 1 = trimmed, 2 = minimal. Chosen automatically to fit the word budget. */
  compact?: 0 | 1 | 2;
  /** Word budget the prompt's own words should fit. */
  budget?: number;
}

export interface Rendered {
  prompt: string;
  changes: string[];
}

interface Parts {
  role?: string;
  goal: string;
  context: string[];
  requirements: string[];
  inputs: string[];
  output: string;
  ask?: string;
  compact: 0 | 1 | 2;
}

function ensurePeriod(s: string): string {
  return /[.!?:)\]"'`]$/.test(s) ? s : `${s}.`;
}

/** Turn slots + template into neutral parts, adding placeholders for what's missing. */
function buildParts(r: RenderInput): { parts: Parts; changes: string[] } {
  const { slots, template, style, context } = r;
  const compact = r.compact ?? 0;
  const changes: string[] = [];
  const usePlaceholders = style !== 'concise';

  const ctx: string[] = [...slots.details.map(ensurePeriod)];
  const tech = [...slots.tech];
  if (context?.languageId && !tech.some((t) => t.toLowerCase() === context.languageId!.toLowerCase())) {
    tech.push(context.languageId);
  }
  if (tech.length) ctx.push(`Tech: ${tech.join(', ')}.`);
  if (context?.fileName) ctx.push(`File: \`${context.fileName}\`.`);
  if (context?.workspaceFiles?.length) ctx.push(`Related files: ${context.workspaceFiles.slice(0, 8).map((f) => `\`${f}\``).join(', ')}.`);
  if (slots.audience) ctx.push(`Audience: ${slots.audience}.`);
  if (slots.tone) ctx.push(`Tone: ${slots.tone}.`);

  const missing = missingSlots(slots, template.wanted);
  if (usePlaceholders) {
    for (const k of missing) {
      const ph = template.placeholders[k];
      if (!ph) continue;
      if (k === 'inputs') continue; // handled in input section
      const label = k === 'tech' ? 'Tech' : k[0]!.toUpperCase() + k.slice(1);
      ctx.push(`${label}: ${ph}`);
    }
  }

  const requirements = [...slots.constraints.map(ensurePeriod)];
  const n = requirements.length;
  const practiceCount = compact >= 2 ? 0 : compact === 1 ? 1 : style === 'detailed' ? 3 : 2;
  if (style !== 'concise' && practiceCount > 0) {
    requirements.push(...template.bestPractice.slice(0, practiceCount));
  }

  const inputs = [...slots.inputs];
  if (!inputs.length && usePlaceholders && missing.includes('inputs') && template.placeholders.inputs) {
    inputs.push(template.placeholders.inputs);
  }

  const outBits: string[] = [];
  if (slots.format) outBits.push(`Format: ${slots.format}.`);
  if (slots.length) outBits.push(`Length: ${slots.length}.`);
  if (!slots.format) outBits.push(template.defaultOutput);
  const output = outBits.join(' ');

  const ask =
    r.askQuestions && missing.length && style !== 'concise' && compact < 2
      ? compact === 1
        ? 'Ask up to 3 short questions if key details are missing; otherwise state your assumptions.'
        : 'If anything important is missing or unclear, ask me up to 3 short questions before you start; otherwise state your assumptions and proceed.'
      : undefined;

  if (template.role) changes.push(`Added an expert role (${template.role.split(' who ')[0]})`);
  if (n) changes.push(`Turned ${n} instruction${n > 1 ? 's' : ''} into explicit requirements`);
  if (style !== 'concise' && practiceCount > 0 && template.bestPractice.length) changes.push('Added best-practice guidance for this kind of task');
  if (slots.inputs.length) changes.push('Kept your code / pasted material verbatim in its own section');
  changes.push(slots.format ? `Kept your requested format (${slots.format})` : 'Specified the output format');
  const phCount = usePlaceholders ? missing.filter((k) => template.placeholders[k]).length : 0;
  if (phCount) changes.push(`Added ${phCount} placeholder${phCount > 1 ? 's' : ''} for details only you know`);
  if (ask) changes.push('Allowed the model to ask clarifying questions');

  return {
    parts: {
      role: template.role || undefined,
      goal: ensurePeriod(slots.goal),
      context: ctx,
      requirements,
      inputs,
      output,
      ask,
      compact,
    },
    changes,
  };
}

const bullets = (items: string[]) => items.map((i) => `- ${i}`).join('\n');
const numbered = (items: string[]) => items.map((i, k) => `${k + 1}. ${i}`).join('\n');
const fenceIfNeeded = (s: string) => (s.startsWith('```') || /^\[.*\]$/.test(s) ? s : `"""\n${s}\n"""`);

function renderXml(p: Parts): string {
  const out: string[] = [];
  if (p.role) out.push(`You are ${p.role}.`);
  if (p.context.length) out.push(`<context>\n${bullets(p.context)}\n</context>`);
  if (p.inputs.length) out.push(`<input>\n${p.inputs.join('\n\n')}\n</input>`);
  out.push(`<task>\n${p.goal}\n</task>`);
  if (p.requirements.length) out.push(`<requirements>\n${bullets(p.requirements)}\n</requirements>`);
  out.push(`<output_format>\n${p.output}\n</output_format>`);
  if (p.ask) out.push(p.ask);
  return out.join('\n\n');
}

function renderMarkdown(p: Parts): string {
  const out: string[] = [];
  if (p.role) out.push(`## Role\nYou are ${p.role}.`);
  out.push(`## Goal\n${p.goal}`);
  if (p.context.length) out.push(`## Context\n${bullets(p.context)}`);
  if (p.requirements.length) out.push(`## Requirements\n${numbered(p.requirements)}`);
  if (p.inputs.length) out.push(`## Input\n${p.inputs.map(fenceIfNeeded).join('\n\n')}`);
  out.push(`## Output format\n${p.output}`);
  if (p.ask) out.push(p.ask);
  return out.join('\n\n');
}

function renderTaskFirst(p: Parts): string {
  const out: string[] = [];
  out.push(p.role ? `${p.goal} Respond as ${p.role}.` : p.goal);
  if (p.context.length) out.push(`Context:\n${bullets(p.context)}`);
  if (p.requirements.length) out.push(`Constraints:\n${bullets(p.requirements)}`);
  out.push(`Format: ${p.output}`);
  if (p.inputs.length) out.push(`Reference material:\n${p.inputs.map(fenceIfNeeded).join('\n\n')}`);
  if (p.ask) out.push(p.ask);
  return out.join('\n\n');
}

function renderCode(p: Parts, intent: Intent): string {
  const out: string[] = [];
  out.push(`## Goal\n${p.goal}`);
  if (p.context.length) out.push(`## Tech & context\n${bullets(p.context)}`);
  if (intent === 'debugging') {
    out.push(`## Error and code\n${p.inputs.length ? p.inputs.join('\n\n') : '[paste the exact error and relevant code]'}`);
  } else if (p.inputs.length) {
    out.push(`## Existing code\n${p.inputs.join('\n\n')}`);
  }
  if (p.requirements.length) out.push(`## Requirements\n${p.requirements.map((r) => `- [ ] ${r}`).join('\n')}`);
  out.push(`## Deliverable\n${p.output}`);
  if (intent === 'coding' || intent === 'debugging') {
    if (p.compact === 0) {
      out.push('## Acceptance criteria\n- The code runs without errors.\n- Every requirement above is met.\n- Existing behaviour that was not mentioned is unchanged.');
    } else if (p.compact === 1) {
      out.push('## Acceptance criteria\nRuns without errors and meets every requirement above.');
    }
  }
  if (p.ask) out.push(p.ask);
  return out.join('\n\n');
}

function renderImage(r: RenderInput): string {
  const subject = r.slots.goal
    .replace(/^(please\s+)?(generate|create|make|draw|design|render|give me)\s+(me\s+)?/i, '')
    .replace(/^(an?\s+)?(image|picture|photo|illustration|artwork)\s+(of|showing|with)\s+/i, '')
    .replace(/[.!]+$/, '');
  const bits = [subject ? subject[0]!.toUpperCase() + subject.slice(1) : r.slots.goal];
  bits.push(...r.slots.details.map((d) => d.replace(/[.!]+$/, '')));
  if (r.slots.tone) bits.push(`${r.slots.tone} mood`);
  if (r.style !== 'concise') {
    bits.push('[art style, e.g. photorealistic / watercolor / 3D render]', '[lighting, e.g. soft golden hour]', '[composition, e.g. close-up, centered]');
  }
  const lines = [bits.join(', ') + '.'];
  if (r.slots.constraints.length) lines.push(`Avoid / must: ${r.slots.constraints.map((c) => c.replace(/[.!]+$/, '')).join('; ')}.`);
  if (r.style !== 'concise') lines.push('Aspect ratio: [e.g. 16:9]');
  return lines.join('\n');
}

/** The rules-only converter: always available, no model needed, never invents facts.
 *  Starts with the full template and trims boilerplate until it fits the word budget,
 *  so a 3-word question never turns into a 120-word brief. */
export function renderOffline(r: RenderInput, profile: ModelProfile = getProfile(r.target)): Rendered {
  const levels: (0 | 1 | 2)[] = r.compact !== undefined ? [r.compact] : [0, 1, 2];
  let out = renderOnce({ ...r, compact: levels[0] }, profile);
  for (const level of levels) {
    out = renderOnce({ ...r, compact: level }, profile);
    if (r.budget === undefined || proseWords(out.prompt, r.slots.inputs) <= r.budget * 1.25) break;
  }
  return out;
}

function renderOnce(r: RenderInput, profile: ModelProfile): Rendered {
  if (profile.structure === 'image' || r.intent === 'image') {
    return {
      prompt: renderImage(r),
      changes: ['Rewrote as a visual description for an image model', 'Added placeholders for style, lighting and composition'].slice(0, r.style === 'concise' ? 1 : 2),
    };
  }
  const { parts, changes } = buildParts(r);
  let prompt: string;
  switch (profile.structure) {
    case 'xml':
      prompt = renderXml(parts);
      changes.unshift('Structured with XML tags, the layout Claude follows best');
      break;
    case 'task-first':
      prompt = renderTaskFirst(parts);
      changes.unshift(`Put the task first with short labelled sections, the layout ${profile.label} prefers`);
      break;
    case 'code':
      prompt = renderCode(parts, r.intent);
      changes.unshift('Organised as a coding brief with requirements and acceptance criteria');
      break;
    default:
      prompt = renderMarkdown(parts);
      changes.unshift(`Organised into Markdown sections, the layout ${profile.label} follows best`);
  }
  return { prompt, changes };
}
