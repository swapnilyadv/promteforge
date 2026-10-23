# PromptForge extension (Chrome)

Adds a **Forge** button on the top-right edge of the message box on claude.ai, chatgpt.com and gemini.google.com. Type a rough message, press Forge (or `⌥⇧F`), and it is rewritten in place for that site's AI, by a model on your own computer (Ollama), or by the built-in rules engine when no model is running. While it works you see the step it is on, the words written so far, a timer and a **Cancel** button. When it is done, press **Undo** in the note to get your original text back. Nothing is sent to a server.

## Install

Download [`promptforge-chrome.zip`](https://promteforge-orpin.vercel.app/downloads/promptforge-chrome.zip), unzip it, open `chrome://extensions` (or `brave://extensions`, `edge://extensions`), turn on **Developer mode**, click **Load unpacked** and pick the `promptforge-extension` folder. For the best prompts, also install [Ollama](https://ollama.com/download) and run `ollama pull qwen2.5:7b`; without it the rules engine writes the prompt.

## Build it yourself

```bash
pnpm install
pnpm --filter @promptforge/extension build      # output: apps/extension/.output/chrome-mv3
```

1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked** → choose `apps/extension/.output/chrome-mv3`.
3. Open claude.ai, click in the message box, type something rough (3+ words). The Forge button appears above the box.

While editing: `pnpm --filter @promptforge/extension dev` opens a Chrome with the extension loaded and reloads it on every change.

## Another way

After a prompt is written, the button changes to **Another way** (also `⌥⇧F` again, or the link in the note). It goes back to *your* original words and builds the prompt with the next approach: full project spec, co-founder brief, roadmap in phases, ask me first, expert persona, draft then critique, short and sharp. Spelling and grammar in your message are fixed first. The note names the approach used.

## How it works

| Part | File | Job |
| --- | --- | --- |
| Content script | `entrypoints/content.ts` | Finds the focused message box, shows the button (in a closed shadow root, so the site's CSS can't touch it), reads the text, writes the result back. Editors like ProseMirror and Quill keep their own document, so it replaces the text with a paste event instead of setting `innerText`. |
| Background worker | `entrypoints/background.ts` | Receives `{forge, text, url}`, calls `convert()` from `@promptforge/core` with the Ollama provider. Only messages from this extension are accepted. |
| Popup | `entrypoints/popup/` | Shows whether Ollama is running, lets you pick the model and length. |
| Forge logic | `lib/forge.ts` | URL → target, model choice, `convert()`. No browser APIs, so it is unit-tested (`pnpm --filter @promptforge/extension test`). |
| Ollama access | `lib/ollama-origin.ts` | Ollama refuses requests from `chrome-extension://` origins unless `OLLAMA_ORIGINS` is set. A declarativeNetRequest rule removes the Origin header on our own calls to port 11434, so a stock install works. |

The model defaults to `qwen2.5` if installed, then `llama3.1`: those are the models the engine was measured with. On the same request, qwen labelled an email as an email and llama called it writing.

## Known limits

- Checked on the live chatgpt.com, claude.ai and gemini.google.com pages (Oct 2026): button placement, live preview, text replacement, Another way and Undo. The sites change their editors often; if the button does not appear or sits in the wrong place, `composerFrom` and `boxAround` in `entrypoints/content.ts` are the first place to look. Please report which site.
- The toast and button are built without `innerHTML`, so pages that enforce Trusted Types (Gemini) accept them.
- Chrome only for now (Edge and Brave load the same build). Firefox needs `wxt build -b firefox` and its own check of the Origin rule.
- The first rewrite after a while is slow while Ollama loads the model.
