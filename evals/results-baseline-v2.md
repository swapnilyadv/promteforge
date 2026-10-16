# PromptForge eval results

- Engine: **ollama (qwen2.5:7b)**, style `balanced`
- Judge: **ollama (llama3.1:8b)** (blind; each pair judged in both A/B orders, a flip counts as a tie)
- Cases: 102 · Core profiles v1
- Run time: 52m 7s, 1 at a time

## Summary

| Metric | Result |
| --- | --- |
| Intent classified correctly | 102/102 (100%) |
| All must-keep details preserved | 98/102 (96%) |
| Passed validators | 93/102 (91%) |
| Mean score (0–100) | 97.8 |
| Model output used (not fallback) | 97/102 (95%) |
| Mean score, model output only | 97.7 |
| **Blind judge: engineered prompt wins** | **75/102 (74%)**, ties 27, losses 0 |
| Judge wins, model output only | 70/97 (72%) |
| Target (session 6) | ≥ 85% |
| Judge: verdicts that flipped with A/B order · failed calls | 27/102 · 0/204 |

## By intent

| Intent | Cases | Intent ok | Keep recall | Mean score |
| --- | --- | --- | --- | --- |
| agent | 5 | 100% | 100% | 92.0 |
| analysis | 8 | 100% | 100% | 100.0 |
| brainstorming | 9 | 100% | 100% | 100.0 |
| coding | 17 | 100% | 97% | 94.1 |
| debugging | 10 | 100% | 100% | 100.0 |
| email | 8 | 100% | 100% | 97.5 |
| image | 6 | 100% | 95% | 94.5 |
| learning | 10 | 100% | 100% | 100.0 |
| other | 6 | 100% | 96% | 95.0 |
| research | 10 | 100% | 100% | 100.0 |
| writing | 13 | 100% | 100% | 100.0 |

## By target

| Target | Cases | Validators ok | Mean score |
| --- | --- | --- | --- |
| chatgpt | 27 | 89% | 97.0 |
| claude | 22 | 95% | 99.1 |
| copilot | 2 | 100% | 100.0 |
| cursor | 3 | 33% | 86.7 |
| deepseek | 1 | 100% | 100.0 |
| gemini | 19 | 95% | 98.9 |
| generic | 12 | 83% | 95.8 |
| grok | 1 | 100% | 100.0 |
| image | 4 | 100% | 96.8 |
| perplexity | 5 | 100% | 100.0 |
| vscode | 6 | 100% | 100.0 |

## Cases below 100

| Case | Score | Problem |
| --- | --- | --- |
| sec-01 | 67 | missing "summarises"; validator: dropped-details |
| ot-04 | 70 | missing "without equipment"; validator: dropped-details |
| code-02 | 72 | missing "localstorage"; validator: dropped-details |
| code-04 | 80 | validator: dropped-details |
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
| wr-04 | failed-checks | lost-input |
| an-02 | failed-checks | lost-input |
| ln-03 | failed-checks | meaning-drift |
