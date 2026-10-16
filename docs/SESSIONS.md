# Session log

Each session follows the plan doc: branch `s<n>-<goal>`, build only that row, run tests, tag `v0.<n>`.

| # | Goal | Status | Notes |
| --- | --- | --- | --- |
| 1 | Monorepo, tooling, CI | Done | pnpm workspaces, Turborepo, TS strict, Vitest, Prettier, GitHub Actions |
| 2 | Provider adapters | Done | Ollama, LM Studio, OpenAI, OpenRouter, Anthropic, Gemini, mock — dependency-free `fetch` + SSE/NDJSON streaming; 8 tests replay each vendor's stream format |
| 3 | Pipeline skeleton | Done | normalize (+ secret redaction), target detection, 10-intent classifier (incl. Hinglish), slot extraction |
| 4 | Profiles, templates, meta-prompt, `convert()` | Done | 11 targets, 11 intent templates, meta-prompt v1, offline renderer, validators, one repair pass, offline fallback |
| 6 (part) | CLI | Done | `pf convert / analyze / models / targets`; live token streaming |
| 5 | Validators + eval harness | Done | 102-case tuned set + 30-case held-out set, deterministic scorer, blind A/B LLM judge (`pnpm eval -j`), baseline in `evals/results.md`, CI regression test. Intent accuracy 84% → 100% on tuned; held-out first run 77% (see results) |
| 6 | Tuning | Paused (target open) | Local blind judge (qwen2.5:7b rewrites, llama3.1:8b judges, both A/B orders). Fixed: length (6/11 → 0/11 over budget), dropped details, false structure alarms, model confirms intent when rules are unsure (unseen batch 63% → 83%). Last full run, 102 cases: validators 90%, details kept 96%, judge wins 61% + 40 ties (80% counting ties as half), 0 losses. **85% target not met: the 8B judge flips with A/B order in ~40% of pairs.** Held-out first run was invalid (8 of 30 cases hit Ollama stalls). Still owed: a stronger judge or a checklist score, a clean held-out rerun, tag `v0.6` |
| 7 | Browser extension scaffold | In progress | WXT, background worker calls core, Forge button in the Claude / ChatGPT / Gemini chat box (branch `s7-extension`) |

## Decisions taken while building

- **Profiles are TypeScript data, not YAML.** Same idea (versioned, data-only), but no YAML parser in the extension bundle and full type checking. Revisit if non-developers need to edit them.
- **No vendor SDKs.** Plain `fetch` keeps the bundle small and identical across Node, browser extension and Tauri.
- **Offline renderer is a first-class mode**, not just a fallback: instant, private, works with no model installed.
- **Secrets never go to cloud models** by default; local models (Ollama / LM Studio) receive the original text.
- **Own harness instead of promptfoo.** ~300 lines, no dependency, same idea (cases → scores → report) and it runs the real `convert()` directly. Swap to promptfoo later only if you want its web UI.
- **Offline renderer trims itself to the word budget.** Three levels (full → trimmed → minimal); a 3-word question no longer becomes a 120-word brief.
- **Already-structured prompts are left alone** in offline mode instead of being re-templated.
- **Intent rules: ties go to the more specific intent**; "coding" keywords are broad so it loses ties. A code editor target only nudges (+0.5), never overrides a stated task.
- Default cloud model names (`gpt-4o-mini`, `claude-haiku-5-5`, `gemini-2.5-flash`) are only defaults; pass `--model` / `model` to change them.
- **Provider timeouts are idle timeouts** (no data for 60 s; 120 s for local models), not a cap on total time. A slow local model that keeps streaming is never cut off; `maxTokens` bounds the length.
- **Anthropic adapter sends no sampling parameters** (current Claude models reject `temperature`/`top_p` with a 400) and adds 4096 tokens of headroom to `max_tokens`, because those models always think and `max_tokens` caps thinking + answer together. A refusal becomes an error, not an empty answer.
- **Local judge only: no paid APIs.** The blind judge runs on Ollama (`llama3.1:8b`, a different model from the `qwen2.5:7b` rewriter). A small judge has position bias, so every pair is judged in both A/B orders and a flipped verdict counts as a tie; judging runs as a second pass so the two models aren't swapped in memory per case.
- **A fallback is reported, never hidden.** `convert()` returns `fallback: { reason, detail }` when a model was given but its output wasn't used, and the eval scores model output separately from fallbacks.

## Verified through session 5

59 tests pass (providers 8, pipeline 35, convert 14, eval-regression 2); strict `tsc` clean for all packages.

Session 6 prep: 61 tests (providers 10, incl. slow-stream and stalled-stream timeouts). Offline eval unchanged: 102/102, mean 100.0 — the tuned set is saturated for the offline engine, so from here only the model run and the blind judge can show progress.

## Known limits (be honest with yourself)

- Intent detection is keyword rules. Held-out accuracy was 77% before general fixes; expect real-world accuracy somewhere below the 100% on the tuned set. **Confirmed by the fresh batch: 63%.** The rules latch onto surface words: "discount *code*" → coding, "data *analyst*" → analysis, "app *crashes*" → debugging, "chore *schedule*" → agent, Hinglish "likh do" → writing. Don't patch the rules from these cases (that spends them). When a model is connected, a wrong intent still steers the rewrite, so session 6 should let the model confirm or override the detected intent.
- The eval so far proves the engine keeps your meaning and meets structure rules. It does **not** yet prove the prompts get better answers. That is what the blind judge is for.
- First live run (15 Oct 2026, qwen2.5:7b on Ollama, M2 / 16 GB): with a training job holding the GPU and swap nearly full, the model generated about **3 tokens/s**. 9 of 10 cases hit the old 120 s total timeout and silently fell back to rules, so the reported 96.0 was mostly the offline engine. Timeout and reporting are fixed, but at that speed a full 102-case run takes hours: free the GPU first and use `--limit` for quick loops.
- Model drafts run long: the cases that did use the model failed the length budget (e.g. 185 words against a budget of 126, even after the repair pass). First thing to tune.
- Cloud adapters are still only tested against recorded stream formats, not live APIs.
- Not under version control yet: the project sits untracked inside a Desktop-level git repo, and `.github/workflows/` only holds an empty file named `ci.yml 1.`. The branch/tag routine above and CI have not actually run.
