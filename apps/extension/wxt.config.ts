import { defineConfig } from 'wxt';

export default defineConfig({
  manifest: {
    name: 'PromptForge',
    description: 'Type rough, press Forge: get the prompt an expert would write, in ChatGPT, Claude and Gemini. Free and private: it runs on your computer.',
    // storage: remember the model and style. declarativeNetRequest: lets the worker talk to Ollama (see lib/ollama-origin.ts).
    permissions: ['storage', 'declarativeNetRequest'],
    host_permissions: ['http://localhost:11434/*', 'http://127.0.0.1:11434/*'],
    action: { default_title: 'PromptForge' },
  },
});
