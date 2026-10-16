import { browser, type Browser } from 'wxt/browser';

type Dnr = Browser.declarativeNetRequest.Rule;

const HOSTS = ['localhost:11434', '127.0.0.1:11434'];

/**
 * Ollama answers 403 to requests whose Origin is chrome-extension://..., unless the user sets
 * OLLAMA_ORIGINS. These rules drop the Origin header on our own requests to the local Ollama port, so
 * the extension works with a stock install and the user changes nothing.
 */
export async function ensureOllamaAccess(): Promise<void> {
  const rules: Dnr[] = HOSTS.map((host, i) => ({
    id: i + 1,
    priority: 1,
    action: {
      type: 'modifyHeaders' as Browser.declarativeNetRequest.RuleActionType,
      requestHeaders: [
        { header: 'Origin', operation: 'remove' as Browser.declarativeNetRequest.HeaderOperation },
      ],
    },
    condition: {
      urlFilter: `||${host}/`,
      initiatorDomains: [browser.runtime.id],
      resourceTypes: ['xmlhttprequest', 'other'] as Browser.declarativeNetRequest.ResourceType[],
    },
  }));
  try {
    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds: rules.map((r) => r.id),
      addRules: rules,
    });
  } catch (err) {
    console.warn('PromptForge: could not set up local Ollama access', err);
  }
}
