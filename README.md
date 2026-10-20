# PromptForge

Turn rough text into a model-aware, well-engineered prompt with one click — inside ChatGPT, Claude, Gemini, VS Code, or anywhere on your desktop.

> Status: **Sessions 1–5 done** (monorepo, providers, core engine, `pf` CLI, eval harness).
> Now: Session 6 (tune with a real model + blind judge; eval prep done) → then Session 7 (browser extension). See `docs/SESSIONS.md`.

## Quick start (macOS)

```bash
# 1. Install Node 20+ and pnpm (once)
brew install node          # or use nvm
corepack enable            # gives you pnpm

# 2. Install and build
cd ~/Desktop/promteforge
pnpm install
pnpm build
pnpm test

# 3. Try it — offline, no model needed
pnpm pf convert -t claude "make me a landing page for my bakery, should look nice. dont use bootstrap"
pnpm pf convert -t chatgpt "write an email to my landlord about the broken heater, firm but polite"
pnpm pf analyze "fix this TypeError in my react app"
```

### Use a local model (private, free)

```bash
brew install ollama && ollama serve        # in another terminal
ollama pull qwen2.5:7b                      # or llama3.1:8b
pnpm pf convert -p ollama -m qwen2.5:7b -t claude "explain kubernetes to a beginner"
```

### Use your own API key

```bash
export ANTHROPIC_API_KEY=...   # or OPENAI_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY
pnpm pf convert -p anthropic -t gemini "compare 3 budget laptops for coding"
```

## Repository layout

```
packages/
  providers/   One streaming interface for Ollama, LM Studio, OpenAI, OpenRouter, Anthropic, Gemini (+ mock).
               Zero dependencies — plain fetch, so it runs in Node, the browser extension and the Tauri webview.
  core/        The prompt engine (below).
apps/
  cli/         `pf` command for trying and testing the engine.
  extension/   Chrome extension: a Forge button in the Claude / ChatGPT / Gemini chat box. See apps/extension/README.md.
evals/         Test cases, scorer and blind LLM judge. See evals/README.md.
```

## How the engine works (`@promptforge/core`)

```
convert({ text, target?, context?, style?, provider? })
```

1. **Normalize** — strips pasted UI noise, protects code, detects language, **redacts secrets** (API keys, passwords) before any cloud call and restores them locally afterwards.
2. **Detect target** — from page URL, desktop app name, window title or editor context.
3. **Classify intent** — 10 intents (coding, debugging, writing, email, research, analysis, learning, brainstorming, image, agent), weighted rules incl. common Hinglish.
4. **Extract slots** — goal, audience, tone, length, format, tech, constraints, verbatim inputs (code, errors, quotes).
5. **Pick profile × template** — model profile (Claude → XML tags, ChatGPT → Markdown, Gemini → task-first, coding tools → brief with acceptance criteria, image → visual description) × intent template.
6. **Generate** — with a provider, an LLM rewrites using the meta-prompt (streamed via `onToken`). Without one, the **offline renderer** builds the prompt from rules — instant and never invents facts.
7. **Validate** — keyword recall (meaning kept), verbatim inputs kept, structure present, length budget, no "Here is…" preamble.
8. **Repair / fall back** — one automatic repair pass; if the model output still drops meaning, falls back to the offline prompt.

Result: `{ prompt, target, intent, mode, changes[], placeholders[], warnings[], validation }`.

## Different approaches, clean wording

PromptForge does not just reformat your words. It first **fixes spelling and grammar** (a short model call; without a model, a tidy-up of common slips), then builds the prompt with one of six **approaches**:

| # | Approach | What the prompt does |
| --- | --- | --- |
| 1 | Clear brief | Task first, then context, requirements, output format |
| 2 | Expert persona | A specific senior expert is briefed like a colleague: what great looks like, trade-offs |
| 3 | Step by step | Four phases: restate, plan, do, check |
| 4 | Ask me first | The AI asks 4–6 sharp questions before it starts |
| 5 | Show an example | A short "what good looks like" sample and a mistake to avoid |
| 6 | Draft, then critique | First draft, a checklist critique, then an improved final version |

The first Forge uses the clear brief. Press **Forge again** (the button says *Another way*) and you get the next approach, built from your original words each time. The same works in the Chrome extension, the VS Code / Cursor / Antigravity extension, the website and the CLI, because they all use `@promptforge/core` (`packages/core/src/strategies.ts`).

The prompt never invents a decision for you: technologies, names and numbers you did not give become placeholders like `[framework]`.

## One change, everywhere

Edit the engine once (`packages/core`), then run:

```bash
pnpm ship
```

It builds and tests everything, repackages the editor extension and reinstalls it into VS Code, Cursor and Antigravity, and rebuilds the Chrome extension and the website. Afterwards: reload the editor window, click the reload arrow on the extension in `chrome://extensions`, and `git push` to publish the website (Vercel deploys `main`).

## Development

| Command | What it does |
| --- | --- |
| `pnpm build` | Build all packages (Turborepo, dependency order) |
| `pnpm test` | Vitest in every package |
| `pnpm typecheck` | Strict TypeScript check |
| `pnpm pf <cmd>` | Run the CLI (`convert`, `analyze`, `models`, `targets`) |
| `pnpm eval` | Score the engine on 100+ cases (add `-p ollama -j anthropic` for model + blind judge) |

Model profiles live in `packages/core/src/profiles/index.ts`; intent templates in `packages/core/src/templates.ts`; the rewriting instructions in `packages/core/src/meta-prompt.ts`. Each has a version number so evals can compare changes.
