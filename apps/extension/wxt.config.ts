import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'PromptForge',
    description: 'Type rough, press Forge. Your message is rewritten into a model-aware prompt by a model on your own computer.',
    // storage: remember the model and style. declarativeNetRequest: lets the worker talk to Ollama (see lib/ollama-origin.ts).
    permissions: ['storage', 'declarativeNetRequest'],
    host_permissions: ['http://localhost:11434/*', 'http://127.0.0.1:11434/*'],
    action: { default_title: 'PromptForge' },
  },
});
