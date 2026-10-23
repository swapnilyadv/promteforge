import { createMock } from '@promptforge/providers';
import { describe, expect, it } from 'vitest';
import { forgeText, pickRange, type ForgeSettings } from '../src/forge.js';

const settings: ForgeSettings = { model: '', style: 'balanced', ollamaUrl: 'http://localhost:11434' };
const ROUGH = 'fix the login bug, users get logged out after 5 minutes';
const GOOD =
  '## Goal\nFix the login bug: users get logged out after 5 minutes.\n## Current behaviour\nUsers are logged out after 5 minutes.\n## Deliverable\nA minimal diff and the root cause.';

const mock = (reply: (isIntent: boolean) => string) =>
  createMock({ type: 'mock', isLocal: true, reply: (req) => reply(req.messages[0]!.content.startsWith('You label')) });

describe('forgeText', () => {
  it('rewrites with the best installed model, for the editor the user is in', async () => {
    let usedModel: string | undefined;
    const stages: string[] = [];
    const r = await forgeText(
      ROUGH,
      { appName: 'Cursor', languageId: 'typescript', fileName: 'src/auth.ts' },
      settings,
      { onStage: (s) => stages.push(s) },
      (_url, model) => {
        usedModel = model;
        return mock((intent) => (intent ? 'debugging' : GOOD));
      },
      ['llama3.1:8b', 'qwen2.5:7b'],
    );
    expect(usedModel).toBe('qwen2.5:7b');
    expect(r.target).toBe('cursor'); // detected from the app name
    expect(r.mode).toBe('llm');
    expect(r.model).toBe('qwen2.5:7b');
    expect(r.prompt).toContain('login bug');
    expect(r.kept).toBeGreaterThan(0.9);
    expect(stages).toContain('rewriting');
  });

  it('treats any other VS Code fork as the generic editor target', async () => {
    const r = await forgeText(ROUGH, { appName: 'Antigravity', languageId: 'python' }, settings, {}, () => mock((i) => (i ? 'debugging' : GOOD)), ['qwen2.5:7b']);
    expect(r.target).toBe('vscode');
  });

  it('falls back to rules, and says so, when Ollama has no models', async () => {
    const r = await forgeText(ROUGH, { appName: 'Visual Studio Code', languageId: 'typescript' }, settings, {}, () => {
      throw new Error('should not be called');
    }, []);
    expect(r.mode).toBe('offline');
    expect(r.warnings[0]).toMatch(/rules engine on this computer/);
    expect(r.prompt.length).toBeGreaterThan(ROUGH.length);
  });

  it('rejects empty text', async () => {
    await expect(forgeText('  ', {}, settings, {}, undefined, [])).rejects.toThrow(/no text/);
  });
});

describe('pickRange', () => {
  it('prefers the selection, then the current line, and gives up on blank lines', () => {
    expect(pickRange('selected words', 'whole line')).toEqual({ text: 'selected words', useLine: false });
    expect(pickRange('  ', 'whole line')).toEqual({ text: 'whole line', useLine: true });
    expect(pickRange('', '   ')).toBeUndefined();
  });
});
