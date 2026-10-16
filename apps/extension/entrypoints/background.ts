import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { forge, status } from '../lib/forge.js';
import type { Message, PortIn, PortOut } from '../lib/messages.js';
import { ensureOllamaAccess } from '../lib/ollama-origin.js';
import { loadSettings } from '../lib/settings.js';

export default defineBackground(() => {
  void ensureOllamaAccess();
  browser.runtime.onInstalled.addListener(() => void ensureOllamaAccess());

  // One-shot questions (the popup asks whether Ollama is running).
  browser.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
    // Only our own pages and content scripts may use the model.
    if (sender.id !== browser.runtime.id) return false;
    const msg = raw as Message;
    void (async () => {
      const settings = await loadSettings();
      if (msg.type === 'status') sendResponse(await status(settings));
    })();
    return true; // keep the channel open for the async reply
  });

  // Forging runs over a port so the page can see progress, and closing the port cancels the work.
  browser.runtime.onConnect.addListener((port) => {
    if (port.name !== 'forge' || port.sender?.id !== browser.runtime.id) return;
    const abort = new AbortController();
    port.onDisconnect.addListener(() => abort.abort());
    port.onMessage.addListener((raw: unknown) => {
      const req = raw as PortIn;
      if (req.type !== 'forge') return;
      void (async () => {
        const send = (m: PortOut) => {
          try {
            port.postMessage(m);
          } catch {
            /* the page closed or cancelled */
          }
        };
        let text = '';
        let lastSent = 0;
        let stage: 'checking-intent' | 'rewriting' | 'repairing' = 'checking-intent';
        const progress = () => send({ type: 'progress', stage, words: (text.match(/\S+/g) ?? []).length });
        const result = await forge({ text: req.text, url: req.url }, await loadSettings(), undefined, undefined, {
          signal: abort.signal,
          onStage: (s) => {
            stage = s;
            if (s !== 'repairing') text = '';
            progress();
          },
          onToken: (t) => {
            text += t;
            // Tokens arrive many times a second; the page only needs a few updates a second.
            if (Date.now() - lastSent > 150) {
              lastSent = Date.now();
              progress();
            }
          },
        });
        send({ type: 'done', result });
      })();
    });
  });
});
