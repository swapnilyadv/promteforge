import { createMock } from '@promptforge/providers';
import { describe, expect, it } from 'vitest';
import { forge, pickModel } from '../lib/forge.js';
import { composerSelectors, worthForging } from '../lib/sites.js';
import type { Settings } from '../lib/settings.js';

const settings: Settings = { model: '', style: 'balanced', baseUrl: 'http://localhost:11434' };
const ROUGH = 'write an email to my landlord about the broken heater, firm but polite';
const GOOD = '## Role\nYou write clear emails.\n## Goal\nWrite an email to my landlord about the broken heater, firm but polite.\n## Output format\nA subject line and a short email.';

describe('forge', () => {
  it('rewrites with the installed model and picks the target from the page URL', async () => {
    let usedModel: string | undefined;
    const r = await forge({ text: ROUGH, url: 'https://chatgpt.com/c/123' }, settings, (_s, model) => {
      usedModel = model;
      return createMock({ type: 'mock', reply: (req) => (req.messages[0]!.content.startsWith('You label') ? 'email' : GOOD), isLocal: true });
    }, ['qwen2.5:7b', 'llama3.1:8b']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(usedModel).toBe('qwen2.5:7b'); // best-measured model when none is chosen
    expect(r.target).toBe('chatgpt');
    expect(r.mode).toBe('llm');
    expect(r.model).toBe('qwen2.5:7b');
    expect(r.prompt).toContain('landlord');
    expect(r.kept).toBeGreaterThan(0.9);
  });

  it('uses the model the user chose', async () => {
    let usedModel: string | undefined;
    await forge({ text: ROUGH, url: 'https://claude.ai/new' }, { ...settings, model: 'llama3.1:8b' }, (_s, model) => {
      usedModel = model;
      return createMock({ type: 'mock', reply: GOOD, isLocal: true });
    }, ['qwen2.5:7b', 'llama3.1:8b']);
    expect(usedModel).toBe('llama3.1:8b');
  });

  it('falls back to rules, and says so, when Ollama has no models', async () => {
    const r = await forge({ text: ROUGH, url: 'https://claude.ai/new' }, settings, () => { throw new Error('should not be called'); }, []);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.mode).toBe('offline');
    expect(r.target).toBe('claude');
    expect(r.warnings[0]).toMatch(/Ollama is not running/);
    expect(r.prompt).toContain('<'); // Claude gets XML sections even without a model
  });

  it('rejects empty text', async () => {
    const r = await forge({ text: '   ', url: 'https://claude.ai/' }, settings, undefined, []);
    expect(r).toEqual({ ok: false, error: 'There is no text to rewrite.' });
  });
});

describe('pickModel', () => {
  it('keeps an installed choice, otherwise prefers the models the engine was measured with', () => {
    expect(pickModel('llama3.1:8b', ['qwen2.5:7b', 'llama3.1:8b'])).toBe('llama3.1:8b');
    expect(pickModel('', ['mistral:7b', 'llama3.1:8b', 'qwen2.5:14b'])).toBe('qwen2.5:14b');
    expect(pickModel('gone:1b', ['mistral:7b', 'llama3.1:8b'])).toBe('llama3.1:8b');
    expect(pickModel('', ['mistral:7b'])).toBe('mistral:7b');
    expect(pickModel('', [])).toBeUndefined();
  });
});

describe('sites', () => {
  it('knows where each chat site keeps its message box', () => {
    expect(composerSelectors('claude.ai')[0]).toContain('ProseMirror');
    expect(composerSelectors('chatgpt.com')[0]).toBe('#prompt-textarea');
    expect(composerSelectors('gemini.google.com')[0]).toContain('ql-editor');
    expect(composerSelectors('example.com')).toContain('textarea');
  });

  it('only offers to forge a message with something to improve', () => {
    expect(worthForging('hi')).toBe(false);
    expect(worthForging('  fix it  ')).toBe(false);
    expect(worthForging('fix this bug please')).toBe(true);
  });
});
