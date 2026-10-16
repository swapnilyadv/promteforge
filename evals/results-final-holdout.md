# PromptForge eval results

- Engine: **ollama (qwen2.5:7b)**, style `balanced`
- Judge: **ollama (llama3.1:8b)** (blind; each pair judged in both A/B orders, a flip counts as a tie)
- Cases: 30 · Core profiles v1
- Run time: 209m 53s, 1 at a time

## Summary

| Metric | Result |
| --- | --- |
| Intent classified correctly | 29/30 (97%) |
| All must-keep details preserved | 29/30 (97%) |
| Passed validators | 27/30 (90%) |
| Mean score (0–100) | 96.5 |
| Model output used (not fallback) | 21/30 (70%) |
| Mean score, model output only | 96.2 |
| **Blind judge: engineered prompt wins** | **18/30 (60%)**, ties 12, losses 0 |
| Judge wins, model output only | 11/21 (52%) |
| Target (session 6) | ≥ 85% |
| Judge: verdicts that flipped with A/B order · failed calls | 12/30 · 1/60 |

## By intent

| Intent | Cases | Intent ok | Keep recall | Mean score |
| --- | --- | --- | --- | --- |
| agent | 1 | 100% | 100% | 100.0 |
| analysis | 2 | 100% | 100% | 90.0 |
| brainstorming | 2 | 100% | 100% | 100.0 |
| coding | 5 | 100% | 100% | 100.0 |
| debugging | 3 | 100% | 100% | 93.3 |
| email | 2 | 100% | 75% | 90.0 |
| image | 2 | 100% | 100% | 100.0 |
| learning | 5 | 100% | 100% | 100.0 |
| other | 2 | 50% | 100% | 87.5 |
| research | 2 | 100% | 100% | 100.0 |
| writing | 4 | 100% | 100% | 95.0 |

## By target

| Target | Cases | Validators ok | Mean score |
| --- | --- | --- | --- |
| chatgpt | 10 | 100% | 97.5 |
| claude | 7 | 86% | 97.1 |
| cursor | 1 | 0% | 80.0 |
| gemini | 6 | 100% | 96.7 |
| generic | 3 | 67% | 93.3 |
| image | 1 | 100% | 100.0 |
| perplexity | 1 | 100% | 100.0 |
| vscode | 1 | 100% | 100.0 |

## Cases below 100

| Case | Score | Problem |
| --- | --- | --- |
| h-ot-01 | 75 | intent: wanted other, got learning |
| h-dbg-03 | 80 | validator: dropped-details |
| h-wr-04 | 80 | validator: dropped-details |
| h-em-01 | 80 | missing "resigning", "30 November" |
| h-an-01 | 80 | validator: dropped-details |

## Fell back to the rules-based prompt

These cases were scored on the rules-based prompt, not the model's.

| Case | Reason | Detail |
| --- | --- | --- |
| h-dbg-01 | failed-checks | meaning-drift |
| h-an-02 | error | ollama: request failed (no data for 120s) |
| h-ln-01 | error | no data for 120s |
| h-ln-03 | error | ollama: request failed (no data for 120s) |
| h-img-01 | error | ollama: request failed (no data for 120s) |
| h-ag-01 | error | ollama: request failed (no data for 120s) |
| h-ot-01 | error | ollama: request failed (no data for 120s) |
| h-st-01 | error | ollama: request failed (no data for 120s) |
| h-sh-01 | error | no data for 120s |
