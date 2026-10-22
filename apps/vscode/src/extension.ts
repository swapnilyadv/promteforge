import * as vscode from 'vscode';
import { nextStrategy, type RequestKind, type StrategyId } from '@promptforge/core';
import { listOllamaModels } from '@promptforge/providers';
import { forgeText, pickRange, STAGE_TEXT, type ForgeOutcome, type ForgeSettings } from './forge.js';

function settings(): ForgeSettings {
  const c = vscode.workspace.getConfiguration('promptforge');
  return {
    model: c.get<string>('model', ''),
    style: c.get<ForgeSettings['style']>('style', 'balanced'),
    ollamaUrl: c.get<string>('ollamaUrl', 'http://localhost:11434'),
  };
}

/** Run one forge behind a cancellable progress notification. */
function forgeWithProgress(text: string, editor?: vscode.TextEditor, strategy?: StrategyId): Thenable<ForgeOutcome | undefined> {
  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'PromptForge', cancellable: true },
    async (progress, token) => {
      const abort = new AbortController();
      token.onCancellationRequested(() => abort.abort());
      const started = Date.now();
      let stage: keyof typeof STAGE_TEXT = 'cleaning';
      const show = () => progress.report({ message: `${STAGE_TEXT[stage]} ${Math.round((Date.now() - started) / 1000)}s` });
      show();
      const timer = setInterval(show, 1000);
      try {
        return await forgeText(
          text,
          {
            // "Cursor", "Visual Studio Code", "Antigravity": detectTarget knows the first two and
            // falls back to the editor target for any VS Code fork via the language id.
            appName: vscode.env.appName,
            languageId: editor?.document.languageId ?? 'plaintext',
            fileName: editor ? vscode.workspace.asRelativePath(editor.document.fileName) : undefined,
          },
          settings(),
          { signal: abort.signal, onStage: (s) => ((stage = s), show()), strategy },
        );
      } catch (err) {
        if (abort.signal.aborted) return undefined;
        void vscode.window.showErrorMessage(`PromptForge: ${err instanceof Error ? err.message : String(err)}`);
        return undefined;
      } finally {
        clearInterval(timer);
      }
    },
  );
}

function summary(r: ForgeOutcome): string {
  const who = r.mode === 'llm' ? `by ${r.model} on this computer` : 'from rules only';
  return `Rewritten for ${r.target} ${who} · approach: ${r.strategy.name} · ${Math.round(r.kept * 100)}% of your details kept${r.cleaned ? ' · spelling fixed' : ''}`;
}

async function toClipboard(r: ForgeOutcome): Promise<boolean> {
  if (!vscode.workspace.getConfiguration('promptforge').get<boolean>('copyResult', true)) return false;
  await vscode.env.clipboard.writeText(r.prompt);
  return true;
}

/** What we last wrote into each document, so pressing Forge on that prompt again means "another way". */
const lastResult = new Map<string, { original: string; prompt: string; strategy: StrategyId; kind: RequestKind }>();
const sameText = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();

/** The range covering `text` inserted at `start`, counting the document's own line endings. */
function insertedRange(doc: vscode.TextDocument, start: vscode.Position, text: string): vscode.Range {
  const length = doc.eol === vscode.EndOfLine.CRLF ? text.replace(/\n/g, '\r\n').length : text.length;
  return new vscode.Range(start, doc.positionAt(doc.offsetAt(start) + length));
}

async function forgeSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return void vscode.window.showInformationMessage('PromptForge: open a file or a chat note and select some text first.');
  const sel = editor.selection;
  const line = editor.document.lineAt(sel.active.line);
  const pick = pickRange(editor.document.getText(sel), line.text);
  if (!pick) return void vscode.window.showInformationMessage('PromptForge: select some text, or put the cursor on a line with a rough request.');
  const range = pick.useLine ? line.range : sel;

  // Forging a prompt we just wrote means "another way": go back to the user's own words and use the next approach.
  const key = editor.document.uri.toString();
  const prev = lastResult.get(key);
  const again = !!prev && sameText(pick.text, prev.prompt);
  const r = await forgeWithProgress(again ? prev!.original : pick.text, editor, again ? nextStrategy(prev!.strategy, prev!.kind) : undefined);
  if (!r) return;
  // Replace in one edit, so a single Undo (Cmd/Ctrl+Z) restores what was there before.
  const start = range.start;
  const ok = await editor.edit((b) => b.replace(range, r.prompt));
  if (!ok) return void vscode.window.showErrorMessage('PromptForge: the editor refused the change. The prompt was copied instead.');
  lastResult.set(key, { original: again ? prev!.original : pick.text, prompt: r.prompt, strategy: r.strategy.id, kind: r.kind });
  // Leave the new prompt selected, so pressing Alt+Shift+F again asks for another way.
  editor.selection = new vscode.Selection(start, insertedRange(editor.document, start, r.prompt).end);
  const copied = await toClipboard(r);
  const warn = r.warnings[0] ? ` ${r.warnings[0]}` : '';
  void vscode.window.showInformationMessage(
    `${summary(r)}.${copied ? ' Copied to the clipboard.' : ''} Press ${process.platform === 'darwin' ? '⌥⇧F' : 'Alt+Shift+F'} again for another way, or Undo with ${process.platform === 'darwin' ? '⌘Z' : 'Ctrl+Z'}.${warn}`,
  );
}

async function write() {
  const text = await vscode.window.showInputBox({
    title: 'PromptForge: write it the way you would say it',
    prompt: 'A rough request. You get a finished prompt back, ready for a chat box.',
    placeHolder: 'e.g. fix the login bug, users get logged out after 5 minutes',
    ignoreFocusOut: true,
  });
  if (!text?.trim()) return;
  const r = await forgeWithProgress(text, vscode.window.activeTextEditor);
  if (!r) return;
  const copied = await toClipboard(r);
  const doc = await vscode.workspace.openTextDocument({ content: r.prompt, language: 'markdown' });
  const shown = await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false });
  lastResult.set(doc.uri.toString(), { original: text, prompt: r.prompt, strategy: r.strategy.id, kind: r.kind });
  if (shown?.selection) shown.selection = new vscode.Selection(new vscode.Position(0, 0), insertedRange(doc, new vscode.Position(0, 0), r.prompt).end);
  void vscode.window.showInformationMessage(`${summary(r)}.${copied ? ' Copied: paste it into your chat box.' : ''} Press ${process.platform === 'darwin' ? '⌥⇧F' : 'Alt+Shift+F'} for another way.`);
}

async function chooseModel() {
  const url = settings().ollamaUrl;
  const models = await listOllamaModels(url);
  if (!models.length) return void vscode.window.showWarningMessage(`PromptForge: Ollama is not reachable at ${url}. Open the Ollama app, then try again.`);
  const pick = await vscode.window.showQuickPick(models, { title: 'PromptForge model', placeHolder: settings().model || 'Automatic (qwen2.5 first)' });
  if (pick) await vscode.workspace.getConfiguration('promptforge').update('model', pick, vscode.ConfigurationTarget.Global);
}

export function activate(context: vscode.ExtensionContext) {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  status.text = '$(sparkle) Forge';
  status.tooltip = 'PromptForge: rewrite the selection into a prompt (Alt+Shift+F)';
  status.command = 'promptforge.forgeSelection';
  status.show();
  context.subscriptions.push(
    status,
    vscode.commands.registerCommand('promptforge.forgeSelection', forgeSelection),
    vscode.commands.registerCommand('promptforge.write', write),
    vscode.commands.registerCommand('promptforge.chooseModel', chooseModel),
  );
}

export function deactivate() {}
