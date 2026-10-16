import { browser } from 'wxt/browser';
import { defineBackground } from 'wxt/utils/define-background';
import { forge, status } from '../lib/forge.js';
import type { Message } from '../lib/messages.js';
import { ensureOllamaAccess } from '../lib/ollama-origin.js';
import { loadSettings } from '../lib/settings.js';

export default defineBackground(() => {
  void ensureOllamaAccess();
  browser.runtime.onInstalled.addListener(() => void ensureOllamaAccess());

  browser.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
    // Only our own pages and content scripts may use the model.
    if (sender.id !== browser.runtime.id) return false;
    const msg = raw as Message;
    void (async () => {
      const settings = await loadSettings();
      if (msg.type === 'forge') sendResponse(await forge({ text: msg.text, url: msg.url }, settings));
      else if (msg.type === 'status') sendResponse(await status(settings));
    })();
    return true; // keep the channel open for the async reply
  });
});
