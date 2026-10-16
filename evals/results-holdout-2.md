# PromptForge eval results

- Engine: **offline (rules only)**, style `balanced`
- Judge: not run
- Cases: 35 · Core profiles v1
- Run time: 0s, 8 at a time

## Summary

| Metric | Result |
| --- | --- |
| Intent classified correctly | 22/35 (63%) |
| All must-keep details preserved | 35/35 (100%) |
| Passed validators | 35/35 (100%) |
| Mean score (0–100) | 90.7 |

## By intent

| Intent | Cases | Intent ok | Keep recall | Mean score |
| --- | --- | --- | --- | --- |
| agent | 3 | 67% | 100% | 91.7 |
| analysis | 3 | 0% | 100% | 75.0 |
| brainstorming | 3 | 67% | 100% | 91.7 |
| coding | 3 | 67% | 100% | 91.7 |
| debugging | 3 | 33% | 100% | 83.3 |
| email | 4 | 100% | 100% | 100.0 |
| image | 3 | 100% | 100% | 100.0 |
| learning | 3 | 67% | 100% | 91.7 |
| other | 3 | 33% | 100% | 83.3 |
| research | 3 | 100% | 100% | 100.0 |
| writing | 4 | 50% | 100% | 87.5 |

## By target

| Target | Cases | Validators ok | Mean score |
| --- | --- | --- | --- |
| chatgpt | 10 | 100% | 90.0 |
| claude | 9 | 100% | 88.9 |
| copilot | 1 | 100% | 100.0 |
| cursor | 1 | 100% | 100.0 |
| deepseek | 1 | 100% | 75.0 |
| gemini | 5 | 100% | 90.0 |
| generic | 3 | 100% | 91.7 |
| grok | 2 | 100% | 87.5 |
| image | 1 | 100% | 100.0 |
| perplexity | 1 | 100% | 100.0 |
| vscode | 1 | 100% | 100.0 |

## Cases below 100

| Case | Score | Problem |
| --- | --- | --- |
| h2-code-02 | 75 | intent: wanted coding, got writing |
| h2-dbg-01 | 75 | intent: wanted debugging, got coding |
| h2-dbg-03 | 75 | intent: wanted debugging, got analysis |
| h2-wr-02 | 75 | intent: wanted writing, got analysis |
| h2-wr-04 | 75 | intent: wanted writing, got coding |
| h2-an-01 | 75 | intent: wanted analysis, got other |
| h2-an-02 | 75 | intent: wanted analysis, got debugging |
| h2-an-03 | 75 | intent: wanted analysis, got other |
| h2-ln-03 | 75 | intent: wanted learning, got other |
| h2-bs-03 | 75 | intent: wanted brainstorming, got other |
| h2-ag-03 | 75 | intent: wanted agent, got other |
| h2-ot-01 | 75 | intent: wanted other, got brainstorming |
| h2-ot-02 | 75 | intent: wanted other, got agent |
