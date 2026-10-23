# PromptForge for VS Code, Cursor and Antigravity

Turns rough text into a well-built prompt, with a model on your own computer (Ollama). Nothing is sent to a server.

Cursor and Antigravity are built on VS Code, so the same `.vsix` installs in all three.

## Use it

- **Select text, press `⌥⇧F`** (Alt+Shift+F), or right-click → *Forge Selection into a Prompt*. With nothing selected it uses the current line. The text is replaced in place; one Undo (`⌘Z`) brings the original back.
- **`⌥⇧W`** or *PromptForge: Write a Prompt…*: type a rough request in the box at the top. The finished prompt opens beside you and is copied to the clipboard, ready to paste into Cursor chat, Copilot chat or any AI.
- **✶ Forge** in the status bar does the same as `⌥⇧F`.
- **Press `⌥⇧F` again** with the new prompt still selected (it stays selected) for **another way**: your original words, the next approach (full project spec, co-founder brief, roadmap in phases, ask me first, expert persona, draft then critique, short and sharp). Spelling and grammar are fixed first.
- A notification shows the step, a timer and a **Cancel** button while the model works.

The first press picks the approach that fits: the full project spec for something to build, an expert brief for a task. Coding tasks get a coding brief (goal, current vs expected behaviour, deliverable, acceptance criteria).

## Needs

Nothing, to start: without a model the built-in rules engine writes the prompt (the note says so). For the best prompts, install [Ollama](https://ollama.com/download) and run `ollama pull qwen2.5:7b`.

## Install

Download [`promptforge.vsix`](https://promteforge-orpin.vercel.app/downloads/promptforge.vsix), then in your editor: **Extensions → ⋯ → Install from VSIX…** and pick the file.

To build it yourself:

```bash
pnpm install
pnpm --filter promptforge package        # makes apps/vscode/promptforge.vsix
```

Then in your editor: **Extensions → ⋯ → Install from VSIX…** and pick the file. Or from a terminal:

```bash
code --install-extension apps/vscode/promptforge.vsix      # VS Code
cursor --install-extension apps/vscode/promptforge.vsix    # Cursor
```

## Settings

| Setting | Default | Meaning |
| --- | --- | --- |
| `promptforge.model` | empty | Ollama model. Empty picks qwen2.5, then llama3.1, then whatever is installed. |
| `promptforge.style` | `balanced` | `concise`, `balanced` or `detailed`. |
| `promptforge.ollamaUrl` | `http://localhost:11434` | Where Ollama runs. |
| `promptforge.copyResult` | `true` | Also copy the prompt to the clipboard. |

## Known limits

- Editors do not let extensions read or write their built-in chat boxes (Cursor chat, Copilot chat), so the flow there is: write here, paste there. The clipboard copy makes that one step.
- Not yet published to the VS Code Marketplace or Open VSX (which Cursor and Antigravity use). Until then, install the `.vsix` by hand.
- Tested with unit tests for the logic; not yet clicked through inside each editor.
