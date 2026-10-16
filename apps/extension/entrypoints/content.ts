import { browser } from 'wxt/browser';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { CHAT_MATCHES, worthForging } from '../lib/sites.js';
import type { ForgeResponse, PortIn, PortOut } from '../lib/messages.js';

type Editable = HTMLTextAreaElement | HTMLElement;

const STYLE = `
  :host { all: initial; }
  * { user-select: none; -webkit-user-select: none; }
  .wrap { position: fixed; z-index: 2147483646; display: none; font: 13px/1.3 -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif; }
  .wrap.show { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; }
  button { font: inherit; cursor: pointer; border: 0; }
  .pill { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; background: #efedf2; color: #0c0c0e; font-weight: 600; box-shadow: 0 4px 18px rgba(0,0,0,.45), 0 0 0 1px rgba(12,12,14,.08); transition: transform .15s ease, background .2s; }
  .pill:hover { transform: translateY(-1px); }
  .pill.busy { background: #ffd9b8; cursor: progress; }
  .pill .star { color: #ff7a1f; }
  .pill kbd { font: 11px ui-monospace, Menlo, monospace; opacity: .5; }
  .spin { animation: spin 1s linear infinite; display: inline-block; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .toast { width: 320px; max-width: calc(100vw - 32px); padding: 11px 13px; border-radius: 12px; background: #18181c; color: #efedf2; box-shadow: 0 6px 24px rgba(0,0,0,.45); border: 1px solid rgba(239,237,242,.14); display: none; gap: 12px; align-items: center; }
  .toast.show { display: flex; }
  .toast .msg { flex: 1; min-width: 0; line-height: 1.4; }
  .toast b { font-weight: 600; }
  .toast .sub { color: #9a97a3; font-size: 12px; margin-top: 3px; }
  .toast .bar { height: 3px; border-radius: 3px; background: rgba(239,237,242,.12); margin-top: 8px; overflow: hidden; }
  .toast .bar i { display: block; height: 100%; width: 40%; background: #ff9a4d; border-radius: 3px; animation: slide 1.4s ease-in-out infinite; }
  @keyframes slide { 0% { transform: translateX(-100%); } 100% { transform: translateX(260%); } }
  .toast button { background: transparent; color: #ff9a4d; font-weight: 600; padding: 4px 6px; }
  .toast.err { border-color: rgba(255,120,120,.55); }
  @media (prefers-reduced-motion: reduce) { .pill, .spin, .bar i { transition: none; animation: none; } }
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

/**
 * The visible rounded box around the editor (the "text bracket"): the nearest ancestor with rounded corners
 * that is at least as wide as the editor. The Forge button is attached to this box, so it moves with it.
 */
function boxAround(el: Editable): HTMLElement {
  const width = el.getBoundingClientRect().width;
  let n: HTMLElement | null = el;
  for (let i = 0; n && i < 8; i++, n = n.parentElement) {
    const radius = parseFloat(getComputedStyle(n).borderTopLeftRadius) || 0;
    if (radius >= 12 && n.getBoundingClientRect().width >= width) return n;
  }
  return el;
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

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

const STAGE_TEXT = {
  'checking-intent': 'Reading what you want…',
  rewriting: 'Writing the prompt',
  repairing: 'Checking that every detail is kept',
} as const;

export default defineContentScript({
  matches: CHAT_MATCHES,
  runAt: 'document_idle',
  main() {
    const host = document.createElement('div');
    host.setAttribute('data-promptforge', '');
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `
      <style>${STYLE}</style>
      <div class="wrap">
        <div class="toast" role="status" aria-live="polite"><div class="msg"></div><button class="act" type="button"></button></div>
        <button class="pill" type="button" title="Rewrite this message (Alt+Shift+F)"><span class="star">✶</span><span class="label">Forge</span><kbd>⌥⇧F</kbd></button>
      </div>`;
    document.documentElement.appendChild(host);

    const wrap = root.querySelector<HTMLElement>('.wrap')!;
    const pill = root.querySelector<HTMLButtonElement>('.pill')!;
    const label = root.querySelector<HTMLElement>('.label')!;
    const kbd = root.querySelector<HTMLElement>('kbd')!;
    const toast = root.querySelector<HTMLElement>('.toast')!;
    const toastMsg = root.querySelector<HTMLElement>('.msg')!;
    const act = root.querySelector<HTMLButtonElement>('.act')!;

    let current: Editable | null = null;
    let busy = false;
    let original: { el: Editable; text: string } | null = null;
    let onAct: (() => void) | null = null;
    let hideTimer = 0;
    let toastTimer = 0;
    let frame = 0;

    // The button sits on the top-right edge of the message box and is re-aimed every frame while it is
    // visible, so it stays attached to the box through scrolling, resizing and the box growing as you type.
    const aim = () => {
      frame = 0;
      if (!current || !current.isConnected) return void wrap.classList.remove('show');
      const show = busy || toast.classList.contains('show') || worthForging(readText(current));
      wrap.classList.toggle('show', show);
      if (!show) return;
      const r = boxAround(current).getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return void wrap.classList.remove('show');
      wrap.style.right = `${Math.max(8, innerWidth - r.right + 14)}px`;
      // The pill straddles the box's top border; the toast stacks above it.
      wrap.style.bottom = `${Math.max(8, innerHeight - r.top - 15)}px`;
      frame = requestAnimationFrame(aim);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(aim);
    };

    const say = (html: string, opts: { action?: { label: string; run: () => void }; error?: boolean; ms?: number; bar?: boolean } = {}) => {
      toastMsg.innerHTML = html + (opts.bar ? '<div class="bar"><i></i></div>' : '');
      toast.classList.toggle('err', !!opts.error);
      onAct = opts.action?.run ?? null;
      act.textContent = opts.action?.label ?? '';
      act.style.display = opts.action ? '' : 'none';
      toast.classList.add('show');
      clearTimeout(toastTimer);
      if (opts.ms !== 0) {
        toastTimer = window.setTimeout(() => {
          toast.classList.remove('show');
          schedule();
        }, opts.ms ?? 9000);
      }
      schedule();
    };
    act.addEventListener('mousedown', (e) => e.preventDefault());
    act.addEventListener('click', () => onAct?.());

    /** Run one forge over a port. Resolves with the result; calling `cancel` closes the port, which stops the model. */
    function forgeOverPort(text: string, onProgress: (p: Extract<PortOut, { type: 'progress' }>) => void) {
      const port = browser.runtime.connect({ name: 'forge' });
      let cancel = () => port.disconnect();
      const done = new Promise<ForgeResponse>((resolve, reject) => {
        // Closing our own end of a port does not notify us, so cancelling settles the promise itself.
        cancel = () => {
          port.disconnect();
          resolve({ ok: false, error: 'Cancelled.' });
        };
        port.onMessage.addListener((raw: unknown) => {
          const m = raw as PortOut;
          if (m.type === 'progress') onProgress(m);
          else {
            resolve(m.result);
            port.disconnect();
          }
        });
        port.onDisconnect.addListener(() => reject(new Error('The extension stopped answering. Reload this tab and try again.')));
        port.postMessage({ type: 'forge', text, url: location.href } satisfies PortIn);
      });
      return { done, cancel: () => cancel() };
    }

    async function run() {
      const el = current;
      if (!el || busy) return;
      const text = readText(el).trim();
      if (!worthForging(text)) return say('Type a little more first: a sentence or two.', { ms: 3500 });

      busy = true;
      let cancelled = false;
      const t0 = Date.now();
      let stage: keyof typeof STAGE_TEXT = 'checking-intent';
      let words = 0;
      const paint = () => {
        const secs = Math.round((Date.now() - t0) / 1000);
        pill.classList.add('busy');
        pill.disabled = true;
        kbd.style.display = 'none';
        label.innerHTML = `<span class="spin">◐</span> Forging ${secs}s`;
        const detail = stage === 'rewriting' && words ? ` · ${words} words` : '';
        const slow = secs > 20 ? '<div class="sub">The model is working on this computer. A longer message takes longer.</div>' : '';
        say(`<b>${STAGE_TEXT[stage]}</b>${detail}${slow}`, { bar: true, ms: 0, action: { label: 'Cancel', run: () => ((cancelled = true), job.cancel()) } });
      };
      const job = forgeOverPort(text, (p) => {
        stage = p.stage;
        words = p.words;
      });
      paint();
      const timer = window.setInterval(paint, 500);
      try {
        const res = await job.done;
        if (cancelled) return void toast.classList.remove('show');
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
        say(`Rewritten for <b>${esc(res.target)}</b> ${who} · ${Math.round(res.kept * 100)}% of your details kept${warn}`, {
          action: {
            label: 'Undo',
            run: () => {
              if (!original?.el.isConnected) return;
              const back = original;
              original = null;
              toast.classList.remove('show');
              void writeText(back.el, back.text).then(schedule);
            },
          },
          ms: 12000,
        });
      } catch (err) {
        if (cancelled) toast.classList.remove('show');
        else say(esc(err instanceof Error ? err.message : String(err)), { error: true });
      } finally {
        clearInterval(timer);
        busy = false;
        pill.disabled = false;
        pill.classList.remove('busy');
        kbd.style.display = '';
        label.textContent = 'Forge';
        schedule();
      }
    }

    // Keep the box focused when the pill is pressed so the browser doesn't drop the selection.
    pill.addEventListener('mousedown', (e) => e.preventDefault());
    pill.addEventListener('click', () => void run());

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
