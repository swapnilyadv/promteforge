import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { CHAT_MATCHES, worthForging } from '../lib/sites.js';
import type { ForgeResponse, Message } from '../lib/messages.js';

type Editable = HTMLTextAreaElement | HTMLElement;

const STYLE = `
  :host { all: initial; }
  .wrap { position: fixed; right: 24px; bottom: 28px; z-index: 2147483646; display: none; font: 13px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  .wrap.show { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
  button { font: inherit; cursor: pointer; border: 0; }
  .pill { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 999px; background: #efedf2; color: #0c0c0e; font-weight: 600; box-shadow: 0 6px 24px rgba(0,0,0,.35); transition: transform .15s ease, opacity .15s; }
  .pill:hover { transform: translateY(-1px); }
  .pill[disabled] { opacity: .75; cursor: progress; }
  .pill .star { color: #ff9a4d; }
  .pill kbd { font: 11px ui-monospace, Menlo, monospace; opacity: .5; }
  .spin { animation: spin 1s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .toast { max-width: 340px; padding: 10px 12px; border-radius: 12px; background: #18181c; color: #efedf2; box-shadow: 0 6px 24px rgba(0,0,0,.4); border: 1px solid rgba(239,237,242,.12); display: none; gap: 10px; align-items: center; }
  .toast.show { display: flex; }
  .toast .msg { flex: 1; min-width: 0; }
  .toast b { font-weight: 600; }
  .toast .sub { color: #8f8c96; font-size: 12px; margin-top: 2px; }
  .toast button { background: transparent; color: #ff9a4d; font-weight: 600; padding: 4px 6px; }
  .toast.err { border-color: rgba(255,120,120,.5); }
  @media (prefers-reduced-motion: reduce) { .pill, .spin { transition: none; animation: none; } }
`;

function isEditable(el: Element | null): el is Editable {
  if (!(el instanceof HTMLElement)) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly && !el.disabled;
  return el.isContentEditable;
}

/** The message box the focus is in: the outermost editable ancestor, so nested ProseMirror nodes resolve to the box. */
function composerFrom(el: Element | null): Editable | null {
  let found: Editable | null = null;
  for (let n: Element | null = el; n; n = n.parentElement) if (isEditable(n)) found = n;
  return found;
}

function readText(el: Editable): string {
  return el instanceof HTMLTextAreaElement ? el.value : el.innerText;
}

function setNativeValue(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter ? setter.call(el, value) : (el.value = value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

const tick = (ms = 40) => new Promise<void>((r) => setTimeout(r, ms));
const same = (a: string, b: string) => a.replace(/\s+/g, ' ').trim() === b.replace(/\s+/g, ' ').trim();

/**
 * Replace the whole message and confirm it worked. Editors like ProseMirror and Quill keep their own
 * document and read the selection a moment after it changes, so each attempt selects everything, waits,
 * then writes; and the result is checked rather than assumed.
 */
async function writeText(el: Editable, text: string): Promise<boolean> {
  el.focus();
  if (el instanceof HTMLTextAreaElement) {
    setNativeValue(el, text);
    return true;
  }
  const selectAll = async () => {
    document.execCommand('selectAll');
    await tick();
  };
  // 1) A paste event: goes through the editor's normal input path and keeps line breaks.
  await selectAll();
  const data = new DataTransfer();
  data.setData('text/plain', text);
  el.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
  await tick(60);
  if (same(readText(el), text)) return true;
  // 2) Typed insertion over a fresh selection (also replaces anything step 1 left behind).
  await selectAll();
  document.execCommand('insertText', false, text);
  await tick(60);
  return same(readText(el), text);
}

function ask(msg: Message): Promise<unknown> {
  return browser.runtime.sendMessage(msg);
}

export default defineContentScript({
  matches: CHAT_MATCHES,
  runAt: 'document_idle',
  main() {
    const host = document.createElement('div');
    host.setAttribute('data-promptforge', '');
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap" part="wrap">
        <div class="toast" role="status" aria-live="polite"><div class="msg"></div><button class="undo" type="button">Undo</button></div>
        <button class="pill" type="button" title="Rewrite this message (Alt+Shift+F)"><span class="star">✶</span><span class="label">Forge</span><kbd>⌥⇧F</kbd></button>
      </div>`;
    document.documentElement.appendChild(host);

    const wrap = root.querySelector<HTMLElement>('.wrap')!;
    const pill = root.querySelector<HTMLButtonElement>('.pill')!;
    const label = root.querySelector<HTMLElement>('.label')!;
    const toast = root.querySelector<HTMLElement>('.toast')!;
    const toastMsg = root.querySelector<HTMLElement>('.msg')!;
    const undo = root.querySelector<HTMLButtonElement>('.undo')!;

    let current: Editable | null = null;
    let busy = false;
    let original: { el: Editable; text: string } | null = null;
    let hideTimer = 0;
    let toastTimer = 0;

    // The button lives in one fixed spot (bottom right of the window), so it never jumps around while you scroll.
    const place = () => {
      if (!current || !current.isConnected) return void wrap.classList.remove('show');
      const show = busy || toast.classList.contains('show') || worthForging(readText(current));
      wrap.classList.toggle('show', show);
    };
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    };

    const say = (html: string, opts: { undo?: boolean; error?: boolean; ms?: number } = {}) => {
      toastMsg.innerHTML = html;
      toast.classList.toggle('err', !!opts.error);
      undo.style.display = opts.undo ? '' : 'none';
      toast.classList.add('show');
      clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => {
        toast.classList.remove('show');
        schedule();
      }, opts.ms ?? 9000);
      schedule();
    };
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

    async function run() {
      const el = current;
      if (!el || busy) return;
      const text = readText(el).trim();
      if (!worthForging(text)) return say('Type a little more first: a sentence or two.', { ms: 3500 });
      busy = true;
      pill.disabled = true;
      label.innerHTML = '<span class="spin">◐</span> Forging';
      // A local model can take a while to load or to finish a busy queue: say so instead of looking frozen.
      const slow = window.setTimeout(() => say('Still working… the model may be loading or busy. This is normal on the first try.', { ms: 120000 }), 8000);
      try {
        const res = (await ask({ type: 'forge', text, url: location.href })) as ForgeResponse | undefined;
        if (!res) throw new Error('No answer from the extension. Reload this tab and try again.');
        if (!res.ok) return say(esc(res.error), { error: true });
        original = { el, text };
        const wrote = await writeText(el, res.prompt);
        if (!wrote) {
          // The editor refused the replacement: leave the user's text alone and hand them the result.
          if (el.isConnected) await writeText(el, text);
          let copied = false;
          try {
            await navigator.clipboard.writeText(res.prompt);
            copied = true;
          } catch {
            /* clipboard blocked */
          }
          return say(copied ? 'This editor would not take the new text. It is copied: select all and press ⌘V (Ctrl+V).' : 'This editor would not take the new text.', { error: true, ms: 12000 });
        }
        const who = res.mode === 'llm' ? `by <b>${esc(res.model ?? 'your model')}</b> on this computer` : 'from <b>rules only</b>';
        const warn = res.warnings[0] ? `<div class="sub">${esc(res.warnings[0])}</div>` : '';
        say(`Rewritten for <b>${esc(res.target)}</b> ${who} · ${Math.round(res.kept * 100)}% of your details kept${warn}`, { undo: true, ms: 12000 });
      } catch (err) {
        say(esc(err instanceof Error ? err.message : String(err)), { error: true });
      } finally {
        clearTimeout(slow);
        busy = false;
        pill.disabled = false;
        label.textContent = 'Forge';
        schedule();
      }
    }

    // Keep the box focused when the pill is pressed so the browser doesn't drop the selection.
    pill.addEventListener('mousedown', (e) => e.preventDefault());
    pill.addEventListener('click', () => void run());
    undo.addEventListener('mousedown', (e) => e.preventDefault());
    undo.addEventListener('click', () => {
      if (!original?.el.isConnected) return;
      const { el, text } = original;
      original = null;
      toast.classList.remove('show');
      void writeText(el, text).then(schedule);
    });

    document.addEventListener('focusin', (e) => {
      const box = composerFrom(e.target as Element);
      if (!box) return;
      clearTimeout(hideTimer);
      current = box;
      schedule();
    });
    document.addEventListener('focusout', () => {
      hideTimer = window.setTimeout(() => {
        if (busy || toast.classList.contains('show') || !current) return;
        if (!composerFrom(document.activeElement)) wrap.classList.remove('show');
      }, 250);
    });
    document.addEventListener('input', schedule, true);
    document.addEventListener(
      'keydown',
      (e) => {
        if (e.altKey && e.shiftKey && e.code === 'KeyF' && !e.ctrlKey && !e.metaKey) {
          e.preventDefault();
          const box = composerFrom(document.activeElement);
          if (box) current = box;
          void run();
        }
      },
      true,
    );
  },
});
