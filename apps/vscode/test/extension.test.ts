import { beforeEach, describe, expect, it, vi } from 'vitest';

// A fake `vscode`: just enough surface for the extension's commands.
const state = vi.hoisted(() => ({
  commands: new Map<string, () => unknown>(),
  info: [] as string[],
  errors: [] as string[],
  clipboard: '',
  config: { copyResult: true } as Record<string, unknown>,
  editor: undefined as unknown,
  inputBox: undefined as string | undefined,
  opened: undefined as { content: string } | undefined,
}));

vi.mock('vscode', () => ({
  ProgressLocation: { Notification: 15 },
  StatusBarAlignment: { Right: 2 },
  ViewColumn: { Beside: -2 },
  ConfigurationTarget: { Global: 1 },
  env: { appName: 'Cursor', clipboard: { writeText: async (t: string) => void (state.clipboard = t) } },
  commands: { registerCommand: (id: string, fn: () => unknown) => (state.commands.set(id, fn), { dispose() {} }) },
  workspace: {
    getConfiguration: () => ({ get: (k: string, d: unknown) => (k in state.config ? state.config[k] : d), update: async () => {} }),
    asRelativePath: (p: string) => p,
    openTextDocument: async (o: { content: string }) => ((state.opened = o), o),
  },
  window: {
    get activeTextEditor() {
      return state.editor;
    },
    createStatusBarItem: () => ({ show() {}, dispose() {} }),
    withProgress: (_o: unknown, task: (p: { report(): void }, t: { onCancellationRequested(): void }) => unknown) =>
      task({ report() {} }, { onCancellationRequested() {} }),
    showInformationMessage: async (m: string) => void state.info.push(m),
    showErrorMessage: async (m: string) => void state.errors.push(m),
    showWarningMessage: async () => {},
    showInputBox: async () => state.inputBox,
    showTextDocument: async () => {},
    showQuickPick: async () => undefined,
  },
}));

vi.mock('@promptforge/providers', async (orig) => ({ ...(await orig<object>()), listOllamaModels: async () => ['qwen2.5:7b'] }));

const outcome = { prompt: '## Goal\nFix the login bug.', mode: 'llm' as const, model: 'qwen2.5:7b', target: 'cursor', intent: 'debugging', kept: 1, warnings: [] };
const forgeText = vi.hoisted(() => vi.fn());
vi.mock('../src/forge.js', async (orig) => ({ ...(await orig<object>()), forgeText }));

import { activate } from '../src/extension.js';

function fakeEditor(sel: string, line: string) {
  const edits: { range: unknown; text: string }[] = [];
  const selection = { active: { line: 3 }, text: sel };
  const lineRange = { id: 'line-range' };
  return {
    edits,
    selection,
    lineRange,
    document: { languageId: 'typescript', fileName: 'src/a.ts', getText: (s: { text: string }) => s.text, lineAt: () => ({ text: line, range: lineRange }) },
    edit: async (cb: (b: { replace(r: unknown, t: string): void }) => void) => (cb({ replace: (range, text) => edits.push({ range, text }) }), true),
  };
}

beforeEach(() => {
  state.commands.clear();
  state.info.length = 0;
  state.errors.length = 0;
  state.clipboard = '';
  state.opened = undefined;
  state.config.copyResult = true;
  forgeText.mockReset().mockResolvedValue(outcome);
  activate({ subscriptions: [] } as never);
});

describe('commands', () => {
  it('registers every command it advertises', () => {
    expect([...state.commands.keys()].sort()).toEqual(['promptforge.chooseModel', 'promptforge.forgeSelection', 'promptforge.write']);
  });

  it('replaces the selection in one edit, copies the prompt, and tells the user how to undo', async () => {
    const ed = fakeEditor('fix the login bug', 'whole line text');
    state.editor = ed;
    await state.commands.get('promptforge.forgeSelection')!();
    expect(forgeText.mock.calls[0]![0]).toBe('fix the login bug');
    expect(forgeText.mock.calls[0]![1]).toMatchObject({ appName: 'Cursor', languageId: 'typescript' });
    expect(ed.edits).toEqual([{ range: ed.selection, text: outcome.prompt }]);
    expect(state.clipboard).toBe(outcome.prompt);
    expect(state.info[0]).toMatch(/Rewritten for cursor by qwen2.5:7b/);
    expect(state.info[0]).toMatch(/Undo/);
  });

  it('uses the current line when nothing is selected', async () => {
    const ed = fakeEditor('', 'fix the login bug please');
    state.editor = ed;
    await state.commands.get('promptforge.forgeSelection')!();
    expect(forgeText.mock.calls[0]![0]).toBe('fix the login bug please');
    expect(ed.edits[0]!.range).toBe(ed.lineRange);
  });

  it('does nothing on an empty line, and leaves the clipboard alone when copying is off', async () => {
    state.editor = fakeEditor('', '   ');
    await state.commands.get('promptforge.forgeSelection')!();
    expect(forgeText).not.toHaveBeenCalled();
    expect(state.info[0]).toMatch(/select some text/i);

    state.config.copyResult = false;
    state.editor = fakeEditor('fix it now please', '');
    await state.commands.get('promptforge.forgeSelection')!();
    expect(forgeText).toHaveBeenCalledTimes(1);
    expect(state.clipboard).toBe('');
  });

  it('write: opens the prompt beside the editor and copies it', async () => {
    state.inputBox = 'fix the login bug';
    await state.commands.get('promptforge.write')!();
    expect(state.opened?.content).toBe(outcome.prompt);
    expect(state.clipboard).toBe(outcome.prompt);
  });

  it('write: a cancelled input box does nothing', async () => {
    state.inputBox = undefined;
    await state.commands.get('promptforge.write')!();
    expect(forgeText).not.toHaveBeenCalled();
  });

  it('shows an error and edits nothing when the model call fails', async () => {
    const ed = fakeEditor('fix the login bug', '');
    state.editor = ed;
    forgeText.mockRejectedValue(new Error('boom'));
    await state.commands.get('promptforge.forgeSelection')!();
    expect(ed.edits).toEqual([]);
    expect(state.errors[0]).toMatch(/boom/);
  });
});
