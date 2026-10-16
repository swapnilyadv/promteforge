# PromptForge eval results

- Engine: **ollama (qwen2.5:7b)**, style `balanced`
- Judge: **ollama (llama3.1:8b)** (blind; each pair judged in both A/B orders, a flip counts as a tie)
- Cases: 102 · Core profiles v1
- Run time: 78m 21s, 1 at a time

## Summary

| Metric | Result |
| --- | --- |
| Intent classified correctly | 98/102 (96%) |
| All must-keep details preserved | 98/102 (96%) |
| Passed validators | 92/102 (90%) |
| Mean score (0–100) | 96.6 |
| Model output used (not fallback) | 99/102 (97%) |
| Mean score, model output only | 96.5 |
| **Blind judge: engineered prompt wins** | **62/102 (61%)**, ties 40, losses 0 |
| Judge wins, model output only | 61/99 (62%) |
| Target (session 6) | ≥ 85% |
| Judge: verdicts that flipped with A/B order · failed calls | 40/102 · 0/204 |

## By intent

| Intent | Cases | Intent ok | Keep recall | Mean score |
| --- | --- | --- | --- | --- |
| agent | 5 | 100% | 100% | 92.0 |
| analysis | 8 | 100% | 100% | 100.0 |
| brainstorming | 9 | 100% | 100% | 100.0 |
| coding | 17 | 100% | 97% | 92.9 |
| debugging | 10 | 100% | 100% | 100.0 |
| email | 8 | 100% | 100% | 97.5 |
| image | 6 | 100% | 95% | 94.5 |
| learning | 10 | 90% | 100% | 97.5 |
| other | 6 | 50% | 100% | 87.5 |
| research | 10 | 100% | 97% | 96.7 |
| writing | 13 | 100% | 100% | 100.0 |

## By target

| Target | Cases | Validators ok | Mean score |
| --- | --- | --- | --- |
| chatgpt | 27 | 81% | 94.1 |
| claude | 22 | 95% | 98.0 |
| copilot | 2 | 100% | 100.0 |
| cursor | 3 | 67% | 93.3 |
| deepseek | 1 | 100% | 100.0 |
| gemini | 19 | 95% | 98.9 |
| generic | 12 | 83% | 94.6 |
| grok | 1 | 100% | 100.0 |
| image | 4 | 100% | 96.8 |
| perplexity | 5 | 100% | 100.0 |
| vscode | 6 | 100% | 95.8 |

## Cases below 100

| Case | Score | Problem |
| --- | --- | --- |
| rs-07 | 67 | missing "price"; validator: dropped-details |
| sec-01 | 67 | missing "summarises"; validator: dropped-details |
| code-02 | 72 | missing "localstorage"; validator: dropped-details |
| ln-08 | 75 | intent: wanted learning, got coding |
| ot-02 | 75 | intent: wanted other, got coding |
| ot-04 | 75 | intent: wanted other, got coding |
| ot-05 | 75 | intent: wanted other, got learning |
| code-06 | 80 | validator: dropped-details |
| code-09 | 80 | validator: dropped-details |
| em-03 | 80 | validator: dropped-details |
| img-05 | 80 | validator: dropped-details |
| ag-01 | 80 | validator: dropped-details |
| ag-04 | 80 | validator: missing-structure |
| st-02 | 80 | validator: dropped-details |
| img-02 | 87 | missing "cat astronaut" |

## Fell back to the rules-based prompt

These cases were scored on the rules-based prompt, not the model's.

| Case | Reason | Detail |
| --- | --- | --- |
| code-11 | failed-checks | lost-input |
| dbg-06 | failed-checks | meaning-drift |
| ln-03 | failed-checks | meaning-drift |
