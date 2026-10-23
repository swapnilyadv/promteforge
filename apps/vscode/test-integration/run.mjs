// End-to-end test in a real VS Code: the built extension, a stand-in Ollama server, and the real editor APIs.
// Uses the VS Code installed on this Mac (set VSCODE_PATH to use another), with a throwaway profile, so your own
// settings and extensions are never touched. Run: pnpm --filter promptforge test:vscode
import { runTests } from '@vscode/test-electron';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ROUGH = 'i want to build my own clothing ecom business like flipkart';
const SPEC = [
  'Prompt: Build My Own Clothing E-Commerce Application',
  '',
  'Act as a senior software architect, full-stack developer and e-commerce business consultant.',
  '',
  'I want to build my own clothing e-commerce business inspired by Flipkart, with its own brand.',
  '',
  '1. Core Features',
  '* Product listings, cart, wishlist and checkout.',
  '',
  'First Task',
  'Ask me the essential questions before writing code.',
].join('\n');
const COFOUNDER = [
  'I want to build my own clothing e-commerce business inspired by Flipkart.',
  '',
  'Act as my technical co-founder, product strategist, and expert full-stack developer.',
  '',
  '* **Customer experience:** clothing catalogue, cart and checkout.',
  '',
  'Start by helping me define the first version of my business.',
].join('\n');

/** A stand-in for Ollama: lists one model and streams fixed answers in its NDJSON format. */
function fakeOllama() {
  let rewrites = 0;
  const server = createServer((req, res) => {
    if (req.url === '/api/tags') {
      res.setHeader('content-type', 'application/json');
      return res.end(JSON.stringify({ models: [{ name: 'qwen2.5:7b' }] }));
    }
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      const { messages } = JSON.parse(body);
      const system = messages[0].content;
      const reply = system.startsWith('You fix spelling')
        ? messages.at(-1).content
        : system.startsWith('You label')
          ? 'other'
          : rewrites++ === 0
            ? SPEC
            : COFOUNDER;
      res.setHeader('content-type', 'application/x-ndjson');
      for (let i = 0; i < reply.length; i += 40) res.write(JSON.stringify({ message: { content: reply.slice(i, i + 40) }, done: false }) + '\n');
      res.end(JSON.stringify({ message: { content: '' }, done: true }) + '\n');
    });
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const server = await fakeOllama();
const port = server.address().port;
const scratch = mkdtempSync(join(tmpdir(), 'promptforge-vscode-'));
const workspace = join(scratch, 'workspace');
mkdirSync(join(workspace, '.vscode'), { recursive: true });
writeFileSync(
  join(workspace, '.vscode', 'settings.json'),
  JSON.stringify({ 'promptforge.ollamaUrl': `http://127.0.0.1:${port}`, 'promptforge.copyResult': false }, null, 2),
);

const MAC = '/Applications/Visual Studio Code.app/Contents/MacOS/Code';
const vscodeExecutablePath = process.env.VSCODE_PATH ?? (existsSync(MAC) ? MAC : undefined);
let code = 0;
try {
  await runTests({
    vscodeExecutablePath,
    extensionDevelopmentPath: join(here, '..'),
    extensionTestsPath: join(here, 'suite.cjs'),
    extensionTestsEnv: { PF_ROUGH: ROUGH },
    launchArgs: [workspace, '--disable-extensions', `--user-data-dir=${join(scratch, 'user')}`, '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust'],
  });
  console.log('\nVS Code end-to-end test passed.');
} catch (err) {
  console.error('\nVS Code end-to-end test failed:', err);
  code = 1;
} finally {
  server.close();
  rmSync(scratch, { recursive: true, force: true });
}
process.exit(code);
