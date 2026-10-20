#!/usr/bin/env node
import { analyze, convert, getStrategy, PROFILES, STRATEGIES, type StrategyId, type Style, type Target } from '@promptforge/core';
import {
  createProvider,
  listOllamaModels,
  OLLAMA_DEFAULT_URL,
  type Provider,
  type ProviderConfig,
} from '@promptforge/providers';
import { readFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

const HELP = `PromptForge CLI — turn rough text into an engineered prompt.

Usage
  pf convert [text]        Convert text (or pipe it in on stdin)
  pf analyze [text]        Show detected target, intent, slots and questions (no model)
  pf models                List local Ollama models
  pf targets               List supported targets

Options
  -t, --target <t>         chatgpt | claude | gemini | vscode | cursor | copilot | perplexity | deepseek | grok | image | generic
  -u, --url <url>          Detect target from a page URL instead
  -s, --style <s>          concise | balanced (default) | detailed
  -a, --approach <a>       brief (default) | expert | stepwise | interview | example | critique, or 1-6
                           A different way to build the prompt for the same request
  -p, --provider <p>       offline (default) | ollama | lmstudio | openai | anthropic | gemini | openrouter
  -m, --model <name>       Model name for the provider
  -f, --file <path>        Read text from a file
      --no-questions       Don't add clarifying-question line
      --json               Print the full result as JSON
  -h, --help

Keys are read from OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY.

Examples
  pf convert "make me a landing page for my bakery" -t claude
  pf convert -t chatgpt -p ollama -m qwen2.5:7b "explain kubernetes simply"
  cat notes.txt | pf convert -t gemini --json
`;

const c = {
  dim: (s: string) => (process.stdout.isTTY ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s: string) => (process.stdout.isTTY ? `\x1b[1m${s}\x1b[0m` : s),
  orange: (s: string) => (process.stdout.isTTY ? `\x1b[38;5;208m${s}\x1b[0m` : s),
  violet: (s: string) => (process.stdout.isTTY ? `\x1b[38;5;141m${s}\x1b[0m` : s),
  yellow: (s: string) => (process.stdout.isTTY ? `\x1b[33m${s}\x1b[0m` : s),
};

async function readStdin(): Promise<string> {
  if (process.stdin.isTTY) return '';
  const chunks: Buffer[] = [];
  for await (const ch of process.stdin) chunks.push(ch as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

function buildProvider(name: string, model?: string): Provider | undefined {
  const env = process.env;
  const need = (key: string) => {
    const v = env[key];
    if (!v) throw new Error(`${key} is not set`);
    return v;
  };
  let cfg: ProviderConfig;
  switch (name) {
    case 'offline':
      return undefined;
    case 'ollama':
      cfg = { type: 'ollama', baseUrl: env.OLLAMA_BASE_URL ?? OLLAMA_DEFAULT_URL, model };
      break;
    case 'lmstudio':
      cfg = { type: 'lmstudio', baseUrl: env.LMSTUDIO_BASE_URL, model };
      break;
    case 'openai':
      cfg = { type: 'openai', apiKey: need('OPENAI_API_KEY'), model };
      break;
    case 'openrouter':
      cfg = { type: 'openrouter', apiKey: need('OPENROUTER_API_KEY'), model };
      break;
    case 'anthropic':
      cfg = { type: 'anthropic', apiKey: need('ANTHROPIC_API_KEY'), model };
      break;
    case 'gemini':
      cfg = { type: 'gemini', apiKey: need('GEMINI_API_KEY'), model };
      break;
    default:
      throw new Error(`Unknown provider "${name}"`);
  }
  return createProvider(cfg);
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      target: { type: 'string', short: 't' },
      url: { type: 'string', short: 'u' },
      style: { type: 'string', short: 's', default: 'balanced' },
      approach: { type: 'string', short: 'a' },
      provider: { type: 'string', short: 'p', default: 'offline' },
      model: { type: 'string', short: 'm' },
      file: { type: 'string', short: 'f' },
      'no-questions': { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
  });

  const [cmd = 'help', ...rest] = positionals;
  if (values.help || cmd === 'help') return void process.stdout.write(HELP);

  if (cmd === 'targets') {
    for (const p of Object.values(PROFILES)) console.log(`${p.id.padEnd(11)} ${c.dim(`${p.label} — ${p.structure}`)}`);
    return;
  }

  if (cmd === 'models') {
    const models = await listOllamaModels(process.env.OLLAMA_BASE_URL ?? OLLAMA_DEFAULT_URL);
    if (!models.length) {
      console.log(c.yellow('Ollama is not running or has no models. Install from ollama.com, then: ollama pull qwen2.5:7b'));
    } else models.forEach((m) => console.log(m));
    return;
  }

  let text = rest.join(' ');
  if (values.file) text = readFileSync(values.file, 'utf8');
  if (!text) text = await readStdin();
  if (!text.trim()) throw new Error('No text given. Pass it as an argument, with --file, or on stdin.');

  const style = values.style as Style;
  if (!['concise', 'balanced', 'detailed'].includes(style)) throw new Error(`Bad --style "${style}"`);
  let strategy: StrategyId | undefined;
  if (values.approach) {
    const n = Number(values.approach);
    strategy = (Number.isInteger(n) ? STRATEGIES[n - 1]?.id : STRATEGIES.find((x) => x.id === values.approach)?.id) as StrategyId | undefined;
    if (!strategy) throw new Error(`Bad --approach "${values.approach}". Use one of: ${STRATEGIES.map((x, i) => `${i + 1}=${x.id}`).join(', ')}`);
  }
  const target = values.target as Target | undefined;
  if (target && !(target in PROFILES)) throw new Error(`Bad --target "${target}". Run: pf targets`);
  const context = values.url ? { url: values.url } : undefined;
  const askQuestions = !values['no-questions'];

  if (cmd === 'analyze') {
    const a = analyze({ text, target, context, style, askQuestions });
    const out = {
      target: a.target,
      intent: a.intent,
      confidence: a.intentConfidence,
      language: a.normalized.language,
      budget: a.budget,
      alreadyStructured: a.alreadyStructured,
      slots: a.slots,
      missing: a.missing,
      questions: a.questions,
      secretsFound: a.normalized.redactions.length,
    };
    console.log(JSON.stringify(out, null, 2));
    return;
  }

  if (cmd !== 'convert') throw new Error(`Unknown command "${cmd}". Run: pf --help`);

  const provider = buildProvider(values.provider!, values.model);
  const live = !values.json && process.stdout.isTTY && !!provider;
  if (live) process.stdout.write(c.dim(`… ${provider!.id} (${provider!.model}) is rewriting\n\n`));

  const result = await convert({
    text,
    target,
    context,
    style,
    strategy,
    askQuestions,
    provider,
    model: values.model,
    onToken: live ? (t) => process.stdout.write(c.dim(t)) : undefined,
  });

  if (values.json) return void console.log(JSON.stringify(result, null, 2));

  if (live) process.stdout.write('\n\n' + c.dim('─'.repeat(60)) + '\n\n');
  console.log(c.orange(c.bold('Engineered prompt')) + c.dim(`  → ${PROFILES[result.target].label} · ${result.intent} · ${result.style} · ${getStrategy(result.strategy).name} · ${result.mode} · ${result.ms} ms`));
  console.log();
  console.log(result.prompt);
  console.log();
  console.log(c.violet('What changed'));
  for (const ch of result.changes) console.log(c.dim(`  + ${ch}`));
  if (result.placeholders.length) {
    console.log(c.violet('Fill in'));
    for (const p of result.placeholders) console.log(c.dim(`  ${p}`));
  }
  for (const w of result.warnings) console.log(c.yellow(`! ${w}`));
}

main().catch((err) => {
  console.error(c.yellow(`pf: ${err instanceof Error ? err.message : String(err)}`));
  process.exit(1);
});
