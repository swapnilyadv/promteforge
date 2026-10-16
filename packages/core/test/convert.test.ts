import { createMock, type GenerateRequest } from '@promptforge/providers';
import { describe, expect, it } from 'vitest';
import { convert } from '../src/index.js';

const BAKERY = 'make me a landing page for my bakery, should look nice and load fast. dont use bootstrap';

describe('convert — offline (rules only)', () => {
  it('Claude gets XML sections', async () => {
    const r = await convert({ text: BAKERY, target: 'claude' });
    expect(r.mode).toBe('offline');
    expect(r.intent).toBe('coding');
    expect(r.prompt).toMatch(/^You are a senior software engineer/);
    expect(r.prompt).toContain('<task>\nMake a landing page for my bakery');
    expect(r.prompt.match(/landing page for my bakery/g)).toHaveLength(1);
    expect(r.prompt).toContain('<requirements>');
    expect(r.prompt).toContain('<output_format>');
    expect(r.prompt).toMatch(/Dont use bootstrap/i);
    expect(r.validation.ok).toBe(true);
    expect(r.placeholders).toContain('[language / framework and version]');
  });

  it('ChatGPT gets Markdown headers with numbered requirements', async () => {
    const r = await convert({ text: BAKERY, context: { url: 'https://chatgpt.com/' } });
    expect(r.target).toBe('chatgpt');
    expect(r.prompt).toContain('## Role');
    expect(r.prompt).toContain('## Requirements\n1. ');
    expect(r.validation.ok).toBe(true);
  });

  it('Gemini gets task-first layout', async () => {
    const r = await convert({ text: 'write an email to my landlord about the broken heater, firm but polite', target: 'gemini' });
    expect(r.intent).toBe('email');
    expect(r.prompt.split('\n')[0]).toMatch(/^Write an email to my landlord/);
    expect(r.prompt).toContain('Format:');
    expect(r.validation.ok).toBe(true);
  });

  it('VS Code gets a coding brief with editor context and acceptance criteria', async () => {
    const r = await convert({
      text: 'add input validation to the signup form',
      context: { appName: 'Code', languageId: 'typescript', fileName: 'src/SignupForm.tsx' },
    });
    expect(r.target).toBe('vscode');
    expect(r.prompt).toContain('## Tech & context');
    expect(r.prompt).toContain('`src/SignupForm.tsx`');
    expect(r.prompt).toContain('## Acceptance criteria');
  });

  it('debugging keeps the error verbatim', async () => {
    const text = "my app crashes on load\n```js\nusers.map(u => u.name)\n```\nTypeError: Cannot read properties of undefined (reading 'map')";
    const r = await convert({ text, target: 'chatgpt' });
    expect(r.intent).toBe('debugging');
    expect(r.prompt).toContain('```js\nusers.map(u => u.name)\n```');
    expect(r.prompt).toContain("TypeError: Cannot read properties of undefined (reading 'map')");
    expect(r.validation.issues.find((i) => i.code === 'lost-input')).toBeUndefined();
  });

  it('image requests become a visual description, not instructions', async () => {
    const r = await convert({ text: 'generate an image of a cat astronaut floating over mumbia at night', target: 'image' });
    expect(r.prompt).toMatch(/^A cat astronaut floating/);
    expect(r.prompt).not.toMatch(/## /);
  });

  it('concise style stays short and adds no placeholders', async () => {
    const r = await convert({ text: 'explain closures in javascript', target: 'chatgpt', style: 'concise' });
    expect(r.placeholders).toHaveLength(0);
    expect(r.validation.words).toBeLessThanOrEqual(r.validation.budget * 1.35);
  });

  it('rejects empty input', async () => {
    await expect(convert({ text: '   ' })).rejects.toThrow(/empty/);
  });
});

describe('convert — with a model', () => {
  const GOOD = [
    'You are a senior software engineer. Build a landing page for my bakery.',
    '',
    '<context>',
    '- It is a landing page for a bakery; it should look nice and load fast.',
    '- Tech: [language / framework and version]',
    '</context>',
    '',
    '<requirements>',
    '- Do not use Bootstrap.',
    '</requirements>',
    '',
    '<output_format>',
    'Complete code with file names.',
    '</output_format>',
  ].join('\n');

  it('streams tokens, validates and returns the model prompt', async () => {
    let seen: GenerateRequest | undefined;
    const provider = createMock({ reply: (req) => ((seen = req), `Here is the prompt:\n${GOOD}`) });
    const tokens: string[] = [];
    const r = await convert({ text: BAKERY, target: 'claude', provider, onToken: (t) => tokens.push(t) });
    expect(r.mode).toBe('llm');
    expect(r.fallback).toBeUndefined();
    expect(r.prompt).toBe(GOOD);
    expect(tokens.join('')).toContain('<requirements>');
    expect(r.repairs).toBe(0);
    // Meta-prompt carries Claude-specific rules and the user's text
    expect(seen!.messages[0]!.content).toContain('XML');
    expect(seen!.messages[1]!.content).toContain(BAKERY);
    // A short request gets a short brief: fewer sections, no generic tips, the limit restated last
    const user = seen!.messages[1]!.content;
    expect(user).toContain('use at most 3');
    expect(user).not.toContain('Good-practice instructions');
    expect(user.trim().split('\n').at(-1)).toMatch(/Hard limit: \d+ words/);
  });

  it('repairs once when the first draft fails validation', async () => {
    let calls = 0;
    const provider = createMock({ reply: () => (++calls === 1 ? 'Make a bakery landing page that looks nice and loads fast without bootstrap.' : GOOD) });
    const r = await convert({ text: BAKERY, target: 'claude', provider });
    expect(calls).toBe(2);
    expect(r.repairs).toBe(1);
    expect(r.mode).toBe('llm');
    expect(r.validation.ok).toBe(true);
  });

  it('repairs a draft that drops a detail, naming exactly what to put back', async () => {
    const text = 'plan a 3 day trip to jaipur for a couple on a mid range budget';
    const full = '## Goal\nPlan a 3 day trip to Jaipur for a couple on a mid range budget.\n## Output format\nA day-by-day plan.';
    const short = '## Goal\nPlan a trip to Jaipur for a couple.\n## Output format\nA day-by-day plan.';
    let calls = 0;
    let repairAsk = '';
    const provider = createMock({
      reply: (req) => {
        if (++calls === 2) repairAsk = req.messages.at(-1)!.content;
        return calls === 1 ? short : full;
      },
    });
    const r = await convert({ text, target: 'chatgpt', provider });
    expect(repairAsk).toContain('"3"');
    expect(repairAsk).toContain('"range"');
    expect(r.mode).toBe('llm');
    expect(r.prompt).toContain('mid range');
    expect(r.validation.issues.map((i) => i.code)).not.toContain('dropped-details');
  });

  it('falls back to offline when the model drops the user meaning', async () => {
    const provider = createMock({ reply: '## Goal\nWrite a poem about the sea.\n## Output format\nA poem.' });
    const r = await convert({ text: BAKERY, target: 'chatgpt', provider });
    expect(r.mode).toBe('offline');
    expect(r.warnings.join(' ')).toMatch(/failed checks/);
    expect(r.fallback).toEqual({ reason: 'failed-checks', detail: 'meaning-drift' });
    expect(r.prompt).toContain('## Goal');
  });

  it('falls back to offline when the provider errors', async () => {
    const provider = createMock({ reply: () => { throw new Error('connection refused'); } });
    const r = await convert({ text: BAKERY, target: 'chatgpt', provider });
    expect(r.mode).toBe('offline');
    expect(r.warnings[0]).toMatch(/connection refused/);
    expect(r.fallback).toEqual({ reason: 'error', detail: 'connection refused' });
  });

  it('never sends secrets to a cloud model, but restores them in the result', async () => {
    let sent = '';
    const key = 'sk-proj-abcdefghijklmnopqrstuvwxyz123456';
    const provider = createMock({
      isLocal: false,
      reply: (req) => {
        sent = req.messages.map((m) => m.content).join('\n');
        return '## Goal\nCall the OpenAI API with key [REDACTED_SECRET_1] from a python script.\n## Output format\nPython code.';
      },
    });
    const r = await convert({ text: `write a python script that calls the openai api with key ${key}`, provider });
    expect(sent).not.toContain(key);
    expect(r.prompt).toContain(key);
    expect(r.warnings.join(' ')).toMatch(/NOT sent/);
  });

  it('local models do receive the original text', async () => {
    let sent = '';
    const key = 'sk-proj-abcdefghijklmnopqrstuvwxyz123456';
    const provider = createMock({ isLocal: true, reply: (req) => ((sent = req.messages[1]!.content), 'x') });
    await convert({ text: `use key ${key} in the script`, provider });
    expect(sent).toContain(key);
  });
});
