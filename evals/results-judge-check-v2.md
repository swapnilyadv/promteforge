# PromptForge eval results

- Engine: **ollama (qwen2.5:7b)**, style `balanced`
- Judge: **ollama (llama3.1:8b)** (blind; each pair judged in both A/B orders, a flip counts as a tie)
- Cases: 11 of 102 (`--limit`, spread across intents) · Core profiles v1
- Run time: 6m 45s, 1 at a time

## Summary

| Metric | Result |
| --- | --- |
| Intent classified correctly | 11/11 (100%) |
| All must-keep details preserved | 9/11 (82%) |
| Passed validators | 11/11 (100%) |
| Mean score (0–100) | 97.0 |
| Model output used (not fallback) | 11/11 (100%) |
| Mean score, model output only | 97.0 |
| **Blind judge: engineered prompt wins** | **10/11 (91%)**, ties 1, losses 0 |
| Judge wins, model output only | 10/11 (91%) |
| Target (session 6) | ≥ 85% |
| Judge: verdicts that flipped with A/B order · failed calls | 1/11 · 0/22 |

## By intent

| Intent | Cases | Intent ok | Keep recall | Mean score |
| --- | --- | --- | --- | --- |
| agent | 1 | 100% | 67% | 87.0 |
| analysis | 1 | 100% | 100% | 100.0 |
| brainstorming | 1 | 100% | 100% | 100.0 |
| coding | 1 | 100% | 100% | 100.0 |
| debugging | 1 | 100% | 100% | 100.0 |
| email | 1 | 100% | 100% | 100.0 |
| image | 1 | 100% | 100% | 100.0 |
| learning | 1 | 100% | 100% | 100.0 |
| other | 1 | 100% | 50% | 80.0 |
| research | 1 | 100% | 100% | 100.0 |
| writing | 1 | 100% | 100% | 100.0 |

## By target

| Target | Cases | Validators ok | Mean score |
| --- | --- | --- | --- |
| chatgpt | 6 | 100% | 96.7 |
| claude | 1 | 100% | 100.0 |
| gemini | 1 | 100% | 100.0 |
| generic | 1 | 100% | 87.0 |
| image | 1 | 100% | 100.0 |
| perplexity | 1 | 100% | 100.0 |

## Cases below 100

| Case | Score | Problem |
| --- | --- | --- |
| ot-01 | 80 | missing "3 day", "mid range" |
| ag-01 | 87 | missing "every morning" |
