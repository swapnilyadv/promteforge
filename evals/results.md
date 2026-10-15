# PromptForge eval results

- Engine: **ollama (qwen2.5:7b)**, style `balanced`
- Judge: not run
- Cases: 10 · Core profiles v1

## Summary

| Metric | Result |
| --- | --- |
| Intent classified correctly | 10/10 (100%) |
| All must-keep details preserved | 10/10 (100%) |
| Passed validators | 8/10 (80%) |
| Mean score (0–100) | 96.0 |
| Model output used (not fallback) | 2/10 (20%) |

## By intent

| Intent | Cases | Intent ok | Keep recall | Mean score |
| --- | --- | --- | --- | --- |
| coding | 10 | 100% | 100% | 96.0 |

## By target

| Target | Cases | Validators ok | Mean score |
| --- | --- | --- | --- |
| chatgpt | 2 | 100% | 100.0 |
| claude | 2 | 50% | 90.0 |
| copilot | 1 | 100% | 100.0 |
| cursor | 1 | 100% | 100.0 |
| gemini | 1 | 100% | 100.0 |
| generic | 1 | 100% | 100.0 |
| vscode | 2 | 50% | 90.0 |

## Cases below 100

| Case | Score | Problem |
| --- | --- | --- |
| code-01 | 80 | validator: too-long |
| code-10 | 80 | validator: too-long |
