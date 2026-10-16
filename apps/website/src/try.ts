import { convert, PROFILES, type Target } from '@promptforge/core';

/**
 * The "write here, get a prompt" box on the landing page. Runs entirely in the visitor's browser with
 * the rules engine: nothing is sent anywhere, and no key or model is needed.
 */
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const input = $<HTMLTextAreaElement>('try-input');
const out = $<HTMLElement>('try-out');
const meta = $<HTMLElement>('try-meta');
const go = $<HTMLButtonElement>('try-go');
const copy = $<HTMLButtonElement>('try-copy');
const target = $<HTMLSelectElement>('try-target');

for (const [id, p] of Object.entries(PROFILES)) {
  if (id === 'image') continue;
  target.add(new Option(p.label, id));
}
target.value = 'claude';

let last = '';

function run() {
  const text = input.value.trim();
  if (!text) {
    meta.textContent = 'Type something first, even a few rough words.';
    return;
  }
  const r = convert({ text, target: target.value as Target, style: 'balanced' });
  // convert() is async when a provider is passed; without one the result is synchronous.
  void Promise.resolve(r).then((res) => {
    last = res.prompt;
    out.textContent = res.prompt;
    const kept = Math.round(res.validation.keywordRecall * 100);
    meta.textContent = `Rules-based, on this device · ${res.intent} · ${kept}% of your key words kept`;
    copy.disabled = false;
  });
}

go.addEventListener('click', run);
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) run();
});
copy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(last);
    copy.textContent = 'Copied';
  } catch {
    copy.textContent = 'Select and copy';
  }
  setTimeout(() => (copy.textContent = 'Copy'), 1600);
});
