# PromptForge extension (Chrome)

Adds a **Forge** button above the message box on claude.ai, chatgpt.com and gemini.google.com. Type a rough message, press Forge (or `⌥⇧F`), and it is rewritten in place for that site's AI by a model on your own computer. Press **Undo** in the pop-up note to get your original text back. Nothing is sent to a server.

## Try it

Needs [Ollama](https://ollama.com) running with a model (`ollama pull qwen2.5:7b`).

```bash
pnpm install
pnpm --filter @promptforge/extension build      # output: apps/extension/.output/chrome-mv3
```

1. Open `chrome://extensions`, turn on **Developer mode**.
2. **Load unpacked** → choose `apps/extension/.output/chrome-mv3`.
3. Open claude.ai, click in the message box, type something rough (3+ words). The Forge button appears above the box.

While editing: `pnpm --filter @promptforge/extension dev` opens a Chrome with the extension loaded and reloads it on every change.

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

- Not yet run inside a real Chrome against the live sites: the editors' markup changes often, and `composerSelectors` in `lib/sites.ts` is the first place to look if the button does not appear. Please report which site.
- Chrome only for now (Edge and Brave load the same build). Firefox needs `wxt build -b firefox` and its own check of the Origin rule.
- The first rewrite after a while is slow while Ollama loads the model.
