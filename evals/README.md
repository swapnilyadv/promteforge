# Evals

Measures how good the converter is, so changes to profiles, templates or the meta-prompt can be judged by numbers instead of feel.

```bash
pnpm build
pnpm eval                              # offline baseline: free, instant, no model
pnpm eval --verbose                    # also list every case below 100
pnpm eval --set holdout                # the held-out cases
pnpm eval --only code,dbg              # only case ids with these prefixes
pnpm eval --limit 11                   # quick run: 11 cases spread across all intents

# With a model rewriting the prompts
pnpm eval -p ollama -m qwen2.5:7b

# + blind judge: is the engineered prompt better than the raw text?
ANTHROPIC_API_KEY=... pnpm eval -p ollama -m qwen2.5:7b -j anthropic
```

Writes `evals/results.md` (change with `--out`).

## Running with a model

- **Local models run one request at a time** (`--concurrency` to change; cloud defaults to 3). A local model serves one request at a time anyway, so parallel requests just queue up.
- **Check speed first.** A full run is about 100 model calls plus repairs. At 20 tokens/s that's under an hour; at 3 tokens/s (another job holding the GPU) it takes hours. Use `--limit 11` while iterating and run the full set at checkpoints.
- **Fallbacks are counted, not hidden.** If the model errors, stalls or fails the meaning checks, `convert()` uses the rules-based prompt. Those cases still get a score, but the report also gives the **model-only** score and a "Fell back to the rules-based prompt" table with the reason. Progress dots: `.` = model output used, `f` = fell back. Tune on the model-only numbers.

## What is scored

Each case is a rough request, a target AI, the expected intent, and `keep`: words from the request that must survive into the prompt.

| Check | Weight | Meaning |
| --- | --- | --- |
| Intent correct | 25 | Classified as the intended task type |
| Details kept | 40 | Share of `keep` terms present in the prompt |
| Validators pass | 20 | Structure, length budget, no preamble, no lost code |
| Sane length | 10 | Not shorter than the request, not absurdly long |
| No preamble | 5 | Doesn't start with "Here is…" |

These are cheap, deterministic **floor** checks: they catch broken output, not mediocre output.

## The blind judge (`-j`)

For each case a judge model sees the raw request and the engineered prompt as **A and B in random order** (seeded, so runs are repeatable) and picks which would get the better answer from the target AI. Report: wins / ties / losses. **Session 6 target: engineered prompt wins ≥ 85%.**

Use a different, stronger model as judge than the one rewriting, and read the "Judge preferred the original" table in the report: those are the cases to learn from.

## Rules for the case files

- `cases.json` is for tuning. `holdout.json` is for checking you did not just memorise `cases.json`.
- When you fix the engine using a holdout miss, that case is spent. Add fresh ones.
- Add a case whenever you see a real-world miss. Keep `keep` to words that really must survive.
- `packages/core/test/eval-regression.test.ts` fails CI if offline intent accuracy drops below 95% on either set.
