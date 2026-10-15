import type { Slots, Style } from './types.js';

export const STYLE_BUDGET: Record<Style, number> = {
  concise: 120,
  balanced: 250,
  detailed: 500,
};

export function countWords(text: string): number {
  const m = text.trim().match(/\S+/g);
  return m ? m.length : 0;
}

/** Words in the text, not counting fenced code or verbatim inputs (those are kept as-is). */
export function proseWords(text: string, inputs: string[] = []): number {
  let t = text.replace(/```[\s\S]*?```/g, ' ');
  for (const i of inputs) t = t.split(i).join(' ');
  return countWords(t);
}

/**
 * Word budget for the prompt's own words. Short inputs stay proportionate:
 * a one-line question never becomes a 500-word prompt.
 */
export function wordBudget(style: Style, originalText: string, slots: Slots): number {
  const base = STYLE_BUDGET[style];
  const userWords = proseWords(originalText, slots.inputs);
  // Proportional cap for tiny inputs, room to grow for long, detailed requests.
  const proportional = Math.max(80, userWords * (style === 'concise' ? 3 : style === 'balanced' ? 6 : 10));
  return Math.max(Math.min(base, proportional), Math.round(userWords * 1.6));
}
