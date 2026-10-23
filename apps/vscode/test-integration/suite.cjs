// Runs inside VS Code's extension host (started by run.mjs). Plain CommonJS, so it needs no build step.
const assert = require('node:assert');
const vscode = require('vscode');

async function forgeLine(text) {
  const doc = await vscode.workspace.openTextDocument({ content: text, language: 'markdown' });
  const editor = await vscode.window.showTextDocument(doc);
  editor.selection = new vscode.Selection(0, 0, 0, doc.lineAt(0).text.length);
  await vscode.commands.executeCommand('promptforge.forgeSelection');
  return { doc, editor };
}

exports.run = async function run() {
  const ext = vscode.extensions.all.find((e) => e.packageJSON.name === 'promptforge');
  assert.ok(ext, 'the PromptForge extension is loaded');
  await ext.activate();
  const commands = await vscode.commands.getCommands(true);
  for (const c of ['promptforge.forgeSelection', 'promptforge.write', 'promptforge.chooseModel']) assert.ok(commands.includes(c), `${c} is registered`);

  // 1. Forge the selection with the model: replaced in place in a single edit (so one Undo restores it),
  //    and the new prompt is left selected.
  const rough = process.env.PF_ROUGH;
  const edits = [];
  const sub = vscode.workspace.onDidChangeTextDocument((e) => e.contentChanges.length && edits.push(e.contentChanges.length));
  const { doc, editor } = await forgeLine(rough);
  assert.match(doc.getText(), /^Prompt: Build My Own Clothing E-Commerce Application/);
  assert.strictEqual(editor.document.getText(editor.selection), doc.getText(), 'the new prompt is selected');
  assert.deepStrictEqual(edits, [1], 'one edit, one change');

  // 2. Forge again on that prompt: "another way" starts from the user's words with the next approach.
  await vscode.commands.executeCommand('promptforge.forgeSelection');
  assert.match(doc.getText(), /technical co-founder/);
  assert.deepStrictEqual(edits, [1, 1], 'again one edit');
  sub.dispose();
  // (Undo itself is VS Code's own Cmd+Z; its command needs a focused window, which a test window does not have.)

  // 4. Without Ollama the rules engine still writes the approach that fits: an expert brief for an email.
  await vscode.workspace.getConfiguration('promptforge').update('ollamaUrl', 'http://127.0.0.1:9', vscode.ConfigurationTarget.Workspace);
  const offline = await forgeLine('write email to my boss asking for 2 days leave next week');
  assert.match(offline.doc.getText(), /What Great Looks Like/);
  assert.match(offline.doc.getText(), /2 days leave next week/i);

  // 5. A cursor on a line with no selection forges that line.
  const doc2 = await vscode.workspace.openTextDocument({ content: 'make me a landing page for my bakery in delhi', language: 'plaintext' });
  const ed2 = await vscode.window.showTextDocument(doc2);
  ed2.selection = new vscode.Selection(0, 5, 0, 5);
  await vscode.commands.executeCommand('promptforge.forgeSelection');
  assert.match(doc2.getText(), /^Prompt: Build My Own Bakery Landing Page/);
};
