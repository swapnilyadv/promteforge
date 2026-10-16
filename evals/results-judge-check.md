# PromptForge eval results

- Engine: **ollama (qwen2.5:7b)**, style `balanced`
- Judge: **ollama (llama3.1:8b)** (blind; each pair judged in both A/B orders, a flip counts as a tie)
- Cases: 11 of 102 (`--limit`, spread across intents) · Core profiles v1
- Run time: 18m 14s, 1 at a time

## Summary

| Metric | Result |
| --- | --- |
| Intent classified correctly | 11/11 (100%) |
| All must-keep details preserved | 10/11 (91%) |
| Passed validators | 5/11 (45%) |
| Mean score (0–100) | 88.2 |
| Model output used (not fallback) | 11/11 (100%) |
| Mean score, model output only | 88.2 |
| **Blind judge: engineered prompt wins** | **11/11 (100%)**, ties 0, losses 0 |
| Judge wins, model output only | 11/11 (100%) |
| Target (session 6) | ≥ 85% |
| Judge: verdicts that flipped with A/B order · failed calls | 0/11 · 0/22 |

## By intent

| Intent | Cases | Intent ok | Keep recall | Mean score |
| --- | --- | --- | --- | --- |
| agent | 1 | 100% | 100% | 80.0 |
| analysis | 1 | 100% | 100% | 100.0 |
| brainstorming | 1 | 100% | 100% | 100.0 |
| coding | 1 | 100% | 100% | 80.0 |
| debugging | 1 | 100% | 100% | 80.0 |
| email | 1 | 100% | 100% | 100.0 |
| image | 1 | 100% | 100% | 100.0 |
| learning | 1 | 100% | 100% | 100.0 |
| other | 1 | 100% | 75% | 70.0 |
| research | 1 | 100% | 100% | 80.0 |
| writing | 1 | 100% | 100% | 80.0 |

## By target

| Target | Cases | Validators ok | Mean score |
| --- | --- | --- | --- |
| chatgpt | 6 | 50% | 88.3 |
| claude | 1 | 0% | 80.0 |
| gemini | 1 | 100% | 100.0 |
| generic | 1 | 0% | 80.0 |
| image | 1 | 100% | 100.0 |
| perplexity | 1 | 0% | 80.0 |

## Cases below 100

| Case | Score | Problem |
| --- | --- | --- |
| ot-01 | 70 | missing "mid range"; validator: too-long |
| code-01 | 80 | validator: too-long |
| dbg-01 | 80 | validator: too-long |
| wr-01 | 80 | validator: too-long |
| rs-01 | 80 | validator: too-long |
| ag-01 | 80 | validator: too-long |
