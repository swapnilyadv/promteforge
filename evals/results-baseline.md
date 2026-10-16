# PromptForge eval results

- Engine: **ollama (qwen2.5:7b)**, style `balanced`
- Judge: **ollama (llama3.1:8b)** (blind; each pair judged in both A/B orders, a flip counts as a tie)
- Cases: 102 · Core profiles v1
- Run time: 90m 27s, 1 at a time

## Summary

| Metric | Result |
| --- | --- |
| Intent classified correctly | 102/102 (100%) |
| All must-keep details preserved | 97/102 (95%) |
| Passed validators | 81/102 (79%) |
| Mean score (0–100) | 95.3 |
| Model output used (not fallback) | 98/102 (96%) |
| Mean score, model output only | 95.1 |
| **Blind judge: engineered prompt wins** | **82/102 (80%)**, ties 20, losses 0 |
| Judge wins, model output only | 78/98 (80%) |
| Target (session 6) | ≥ 85% |
| Judge: verdicts that flipped with A/B order · failed calls | 20/102 · 0/204 |

## By intent

| Intent | Cases | Intent ok | Keep recall | Mean score |
| --- | --- | --- | --- | --- |
| agent | 5 | 100% | 100% | 92.0 |
| analysis | 8 | 100% | 100% | 95.0 |
| brainstorming | 9 | 100% | 100% | 97.8 |
| coding | 17 | 100% | 97% | 92.9 |
| debugging | 10 | 100% | 100% | 96.0 |
| email | 8 | 100% | 100% | 95.0 |
| image | 6 | 100% | 95% | 94.5 |
| learning | 10 | 100% | 100% | 100.0 |
| other | 6 | 100% | 96% | 98.3 |
| research | 10 | 100% | 97% | 92.7 |
| writing | 13 | 100% | 100% | 95.4 |

## By target

| Target | Cases | Validators ok | Mean score |
| --- | --- | --- | --- |
| chatgpt | 27 | 85% | 96.3 |
| claude | 22 | 91% | 98.2 |
| copilot | 2 | 100% | 100.0 |
| cursor | 3 | 67% | 93.3 |
| deepseek | 1 | 100% | 100.0 |
| gemini | 19 | 74% | 94.7 |
| generic | 12 | 75% | 94.2 |
| grok | 1 | 0% | 80.0 |
| image | 4 | 100% | 96.8 |
| perplexity | 5 | 40% | 85.4 |
| vscode | 6 | 67% | 93.3 |

## Cases below 100

| Case | Score | Problem |
| --- | --- | --- |
| sec-01 | 67 | missing "summarises"; validator: dropped-details |
| rs-09 | 67 | missing "70000"; validator: dropped-details, missing-structure |
| code-02 | 72 | missing "localstorage"; validator: dropped-details |
| dbg-03 | 80 | validator: missing-structure |
| dbg-07 | 80 | validator: missing-structure |
| wr-04 | 80 | validator: missing-structure |
| wr-08 | 80 | validator: missing-structure |
| wr-10 | 80 | validator: dropped-details |
| em-03 | 80 | validator: dropped-details |
| em-04 | 80 | validator: too-long |
| rs-03 | 80 | validator: missing-structure |
| rs-05 | 80 | validator: missing-structure |
| an-03 | 80 | validator: missing-structure |
| bs-03 | 80 | validator: missing-structure, too-long |
| img-05 | 80 | validator: dropped-details |
| ag-01 | 80 | validator: missing-structure |
| ag-04 | 80 | validator: missing-structure |
| st-02 | 80 | validator: dropped-details |
| code-13 | 80 | validator: missing-structure |
| an-08 | 80 | validator: dropped-details |
| code-14 | 80 | validator: too-long |
| img-02 | 87 | missing "cat astronaut" |
| ot-04 | 90 | missing "without equipment" |

## Fell back to the rules-based prompt

These cases were scored on the rules-based prompt, not the model's.

| Case | Reason | Detail |
| --- | --- | --- |
| code-11 | failed-checks | lost-input |
| dbg-06 | failed-checks | meaning-drift |
| an-07 | failed-checks | meaning-drift |
| ln-03 | failed-checks | meaning-drift |
