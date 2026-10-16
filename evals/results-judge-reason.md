# PromptForge eval results

- Engine: **ollama (qwen2.5:7b)**, style `balanced`
- Judge: **ollama (llama3.1:8b)** (blind; each pair judged in both A/B orders, a flip counts as a tie)
- Cases: 22 of 102 (`--limit`, spread across intents) · Core profiles v1
- Run time: 15m 23s, 1 at a time

## Summary

| Metric | Result |
| --- | --- |
| Intent classified correctly | 22/22 (100%) |
| All must-keep details preserved | 20/22 (91%) |
| Passed validators | 19/22 (86%) |
| Mean score (0–100) | 96.3 |
| Model output used (not fallback) | 22/22 (100%) |
| Mean score, model output only | 96.3 |
| **Blind judge: engineered prompt wins** | **18/22 (82%)**, ties 4, losses 0 |
| Judge wins, model output only | 18/22 (82%) |
| Target (session 6) | ≥ 85% |
| Judge: verdicts that flipped with A/B order · failed calls | 4/22 · 1/44 |

## By intent

| Intent | Cases | Intent ok | Keep recall | Mean score |
| --- | --- | --- | --- | --- |
| agent | 2 | 100% | 100% | 90.0 |
| analysis | 2 | 100% | 100% | 100.0 |
| brainstorming | 2 | 100% | 100% | 100.0 |
| coding | 2 | 100% | 90% | 86.0 |
| debugging | 2 | 100% | 100% | 100.0 |
| email | 2 | 100% | 100% | 100.0 |
| image | 2 | 100% | 84% | 93.5 |
| learning | 2 | 100% | 100% | 90.0 |
| other | 2 | 100% | 100% | 100.0 |
| research | 2 | 100% | 100% | 100.0 |
| writing | 2 | 100% | 100% | 100.0 |

## By target

| Target | Cases | Validators ok | Mean score |
| --- | --- | --- | --- |
| chatgpt | 9 | 89% | 96.9 |
| claude | 7 | 100% | 100.0 |
| gemini | 2 | 50% | 90.0 |
| generic | 1 | 0% | 80.0 |
| image | 2 | 100% | 93.5 |
| perplexity | 1 | 100% | 100.0 |

## Cases below 100

| Case | Score | Problem |
| --- | --- | --- |
| code-02 | 72 | missing "localstorage"; validator: dropped-details |
| ag-01 | 80 | validator: dropped-details |
| ln-02 | 80 | validator: missing-structure |
| img-02 | 87 | missing "cat astronaut" |
