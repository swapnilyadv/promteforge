import type { ConvertContext, Target } from './types.js';

const HOSTS: [RegExp, Target][] = [
  [/(^|\.)chatgpt\.com$|(^|\.)chat\.openai\.com$/, 'chatgpt'],
  [/(^|\.)claude\.ai$/, 'claude'],
  [/(^|\.)gemini\.google\.com$|(^|\.)aistudio\.google\.com$/, 'gemini'],
  [/(^|\.)copilot\.microsoft\.com$|(^|\.)github\.com$/, 'copilot'],
  [/(^|\.)perplexity\.ai$/, 'perplexity'],
  [/(^|\.)chat\.deepseek\.com$/, 'deepseek'],
  [/(^|\.)grok\.com$|(^|\.)x\.com$/, 'grok'],
  [/(^|\.)midjourney\.com$|(^|\.)leonardo\.ai$|(^|\.)ideogram\.ai$/, 'image'],
  [/(^|\.)cursor\.(com|sh)$/, 'cursor'],
];

const APPS: [RegExp, Target][] = [
  [/^cursor/i, 'cursor'],
  [/^(code|code - insiders|visual studio code|vscodium|windsurf)(\.exe)?$/i, 'vscode'],
  [/^chatgpt/i, 'chatgpt'],
  [/^claude/i, 'claude'],
  [/^gemini/i, 'gemini'],
  [/^(copilot|microsoft copilot)/i, 'copilot'],
  [/^perplexity/i, 'perplexity'],
];

/** Picks the target model family from where the user is typing. Falls back to 'generic'. */
export function detectTarget(ctx: ConvertContext = {}): Target {
  if (ctx.url) {
    try {
      const host = new URL(ctx.url).hostname.toLowerCase();
      // github.com is only Copilot on its chat pages
      if (/(^|\.)github\.com$/.test(host) && !/\/copilot/.test(ctx.url)) {
        // fall through to app / generic
      } else {
        for (const [re, t] of HOSTS) if (re.test(host)) return t;
      }
    } catch {
      /* not a URL */
    }
  }
  if (ctx.appName) {
    const app = ctx.appName.trim();
    for (const [re, t] of APPS) if (re.test(app)) return t;
  }
  if (ctx.windowTitle) {
    const t = ctx.windowTitle.toLowerCase();
    if (t.includes('chatgpt')) return 'chatgpt';
    if (t.includes('claude')) return 'claude';
    if (t.includes('gemini')) return 'gemini';
    if (t.includes('visual studio code')) return 'vscode';
  }
  if (ctx.languageId || ctx.fileName) return 'vscode';
  return 'generic';
}

/** Targets where the user is writing for a coding assistant. */
export function isCodeTarget(t: Target): boolean {
  return t === 'vscode' || t === 'cursor' || t === 'copilot';
}
