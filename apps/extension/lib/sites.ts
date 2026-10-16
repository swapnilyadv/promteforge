/** Chat sites the Forge button works on. Keep in sync with `matches` in entrypoints/content.ts. */
export const CHAT_MATCHES = [
  'https://claude.ai/*',
  'https://chatgpt.com/*',
  'https://chat.openai.com/*',
  'https://gemini.google.com/*',
];

/** Where each site keeps its message box. Tried in order; the focused editable box is used first anyway. */
const COMPOSERS: [RegExp, string[]][] = [
  [/(^|\.)claude\.ai$/, ['div[contenteditable="true"].ProseMirror', '[data-testid="chat-input"]']],
  [/(^|\.)(chatgpt\.com|chat\.openai\.com)$/, ['#prompt-textarea', 'div[contenteditable="true"].ProseMirror', 'textarea']],
  [/(^|\.)gemini\.google\.com$/, ['rich-textarea .ql-editor', 'div[contenteditable="true"][role="textbox"]']],
];

export function composerSelectors(host: string): string[] {
  const h = host.toLowerCase();
  return COMPOSERS.find(([re]) => re.test(h))?.[1] ?? ['textarea', 'div[contenteditable="true"]'];
}

/** A message this short has nothing to improve; the button stays hidden. */
export function worthForging(text: string): boolean {
  return (text.trim().match(/\S+/g) ?? []).length >= 3;
}
