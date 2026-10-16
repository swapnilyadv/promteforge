import * as vscode from 'vscode';
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
function forgeWithProgress(text: string, editor?: vscode.TextEditor): Thenable<ForgeOutcome | undefined> {
  return vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'PromptForge', cancellable: true },
    async (progress, token) => {
      const abort = new AbortController();
      token.onCancellationRequested(() => abort.abort());
      const started = Date.now();
      let stage: keyof typeof STAGE_TEXT = 'checking-intent';
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
          { signal: abort.signal, onStage: (s) => ((stage = s), show()) },
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
  return `Rewritten for ${r.target} ${who} · ${Math.round(r.kept * 100)}% of your details kept`;
}

async function toClipboard(r: ForgeOutcome): Promise<boolean> {
  if (!vscode.workspace.getConfiguration('promptforge').get<boolean>('copyResult', true)) return false;
  await vscode.env.clipboard.writeText(r.prompt);
  return true;
}

async function forgeSelection() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return void vscode.window.showInformationMessage('PromptForge: open a file or a chat note and select some text first.');
  const sel = editor.selection;
  const line = editor.document.lineAt(sel.active.line);
  const pick = pickRange(editor.document.getText(sel), line.text);
  if (!pick) return void vscode.window.showInformationMessage('PromptForge: select some text, or put the cursor on a line with a rough request.');
  const range = pick.useLine ? line.range : sel;

  const r = await forgeWithProgress(pick.text, editor);
  if (!r) return;
  // Replace in one edit, so a single Undo (Cmd/Ctrl+Z) restores the original text.
  const ok = await editor.edit((b) => b.replace(range, r.prompt));
  if (!ok) return void vscode.window.showErrorMessage('PromptForge: the editor refused the change. The prompt was copied instead.');
  const copied = await toClipboard(r);
  const warn = r.warnings[0] ? ` ${r.warnings[0]}` : '';
  void vscode.window.showInformationMessage(`${summary(r)}.${copied ? ' Copied to the clipboard.' : ''} Undo with ${process.platform === 'darwin' ? '⌘Z' : 'Ctrl+Z'}.${warn}`);
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
  await vscode.window.showTextDocument(doc, { viewColumn: vscode.ViewColumn.Beside, preserveFocus: false });
  void vscode.window.showInformationMessage(`${summary(r)}.${copied ? ' Copied: paste it into your chat box.' : ''}`);
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
