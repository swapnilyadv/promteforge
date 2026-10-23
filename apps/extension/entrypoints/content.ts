import { nextStrategy, type RequestKind, type StrategyId } from '@promptforge/core';
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
  .toast .btns { display: flex; flex-direction: column; gap: 2px; align-items: flex-end; }
  .toast button { background: transparent; color: #ff9a4d; font-weight: 600; padding: 4px 6px; white-space: nowrap; }
  .toast.err { border-color: rgba(255,120,120,.55); }
  .peek { margin-top: 8px; max-height: 4.6em; overflow: hidden; display: flex; flex-direction: column; justify-content: flex-end; font: 11.5px/1.5 ui-monospace, Menlo, monospace; color: #b9b6c0; white-space: pre-wrap; word-break: break-word; -webkit-mask-image: linear-gradient(to bottom, transparent, #000 45%); mask-image: linear-gradient(to bottom, transparent, #000 45%); }
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
  let rounded: HTMLElement | null = null;
  let n: HTMLElement | null = el;
  // Gemini's box is nine levels above its editor; ChatGPT's and Claude's are closer.
  for (let i = 0; n && i < 14; i++, n = n.parentElement) {
    const cs = getComputedStyle(n);
    if ((parseFloat(cs.borderTopLeftRadius) || 0) < 12 || n.getBoundingClientRect().width < width) continue;
    // Prefer a box you can see (a fill, a border or a shadow) over an invisible rounded wrapper.
    const visible = !/^(transparent|rgba\(0, 0, 0, 0\))$/.test(cs.backgroundColor) || parseFloat(cs.borderTopWidth) > 0 || cs.boxShadow !== 'none';
    if (visible) return n;
    rounded ??= n;
  }
  return rounded ?? el;
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

type Child = Node | string | false | null | undefined;

/**
 * Builds elements without innerHTML: pages such as Gemini enforce Trusted Types, which reject HTML strings, and
 * text set this way can never be read as markup.
 */
function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', ...kids: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  for (const k of kids) if (k) el.append(k);
  return el;
}
const bold = (s: string) => h('b', '', s);
const sub = (...kids: Child[]) => h('div', 'sub', ...kids);

const STAGE_TEXT = {
  cleaning: 'Fixing spelling and grammar…',
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
    const style = h('style');
    style.textContent = STYLE;
    const toastMsg = h('div', 'msg');
    const act = h('button', 'act');
    const act2 = h('button', 'act act2');
    const toast = h('div', 'toast', toastMsg, h('div', 'btns', act, act2));
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    const label = h('span', 'label', 'Forge');
    const kbd = h('kbd', '', '⌥⇧F');
    const pill = h('button', 'pill', h('span', 'star', '✶'), label, kbd);
    pill.title = 'Rewrite this message (Alt+Shift+F)';
    for (const b of [act, act2, pill]) b.type = 'button';
    const wrap = h('div', 'wrap', toast, pill);
    root.append(style, wrap);
    document.documentElement.appendChild(host);

    let current: Editable | null = null;
    let busy = false;
    let original: { el: Editable; text: string } | null = null;
    let onAct: (() => void) | null = null;
    let onAct2: (() => void) | null = null;
    /** The last prompt written into a box: what it came from and which approach made it. */
    let last: { el: Editable; original: string; prompt: string; strategy: StrategyId; kind: RequestKind } | null = null;
    let hideTimer = 0;
    let toastTimer = 0;
    let frame = 0;
    /** The box found for the current editor; looked up again only when the editor or the page layout changes it. */
    let box: { for: Editable; el: HTMLElement } | null = null;

    // The button sits on the top-right edge of the message box and is re-aimed every frame while it is
    // visible, so it stays attached to the box through scrolling, resizing and the box growing as you type.
    const aim = () => {
      frame = 0;
      if (!current || !current.isConnected) return void wrap.classList.remove('show');
      const show = busy || toast.classList.contains('show') || worthForging(readText(current));
      wrap.classList.toggle('show', show);
      if (!show) return;
      if (!box || box.for !== current || !box.el.isConnected || !box.el.contains(current)) box = { for: current, el: boxAround(current) };
      const r = box.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return void wrap.classList.remove('show');
      wrap.style.right = `${Math.max(8, innerWidth - r.right + 14)}px`;
      // The pill straddles the box's top border; the toast stacks above it.
      wrap.style.bottom = `${Math.max(8, innerHeight - r.top - 12)}px`;
      frame = requestAnimationFrame(aim);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(aim);
    };

    const say = (content: Child[], opts: { actions?: { label: string; run: () => void }[]; error?: boolean; ms?: number; bar?: boolean } = {}) => {
      toastMsg.replaceChildren(...content.filter((c): c is Node | string => !!c), ...(opts.bar ? [h('div', 'bar', h('i'))] : []));
      toast.classList.toggle('err', !!opts.error);
      const [a1, a2] = opts.actions ?? [];
      onAct = a1?.run ?? null;
      onAct2 = a2?.run ?? null;
      act.textContent = a1?.label ?? '';
      act.style.display = a1 ? '' : 'none';
      act2.textContent = a2?.label ?? '';
      act2.style.display = a2 ? '' : 'none';
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
    for (const [b, f] of [[act, () => onAct?.()], [act2, () => onAct2?.()]] as const) {
      b.addEventListener('mousedown', (e) => e.preventDefault());
      b.addEventListener('click', f);
    }

    /** Run one forge over a port. Resolves with the result; calling `cancel` closes the port, which stops the model. */
    function forgeOverPort(text: string, strategy: StrategyId | undefined, onProgress: (p: Extract<PortOut, { type: 'progress' }>) => void) {
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
        port.postMessage({ type: 'forge', text, url: location.href, strategy } satisfies PortIn);
      });
      return { done, cancel: () => cancel() };
    }

    /** After a prompt is in the box the button offers the next approach instead of starting over. */
    function updateLabel() {
      if (busy) return;
      const another = !!last && !!current && last.el === current && same(readText(current), last.prompt);
      label.textContent = another ? 'Another way' : 'Forge';
      pill.title = another ? 'Rewrite your original message with a different approach (Alt+Shift+F)' : 'Rewrite this message (Alt+Shift+F)';
    }

    async function run() {
      const el = current;
      if (!el || busy) return;
      const now = readText(el).trim();
      // Pressing Forge again on a prompt we just wrote means "another way": go back to the user's own words
      // and build it with the next approach. Anything else is a fresh message.
      const again = !!last && last.el === el && same(now, last.prompt);
      const text = again ? last!.original : now;
      const strategy: StrategyId | undefined = again ? nextStrategy(last!.strategy, last!.kind) : undefined;
      if (!worthForging(text)) return say(['Type a little more first: a sentence or two.'], { ms: 3500 });

      busy = true;
      let cancelled = false;
      const t0 = Date.now();
      let stage: keyof typeof STAGE_TEXT = 'cleaning';
      let words = 0;
      let tail = '';
      const paint = () => {
        const secs = Math.round((Date.now() - t0) / 1000);
        pill.classList.add('busy');
        pill.disabled = true;
        kbd.style.display = 'none';
        label.replaceChildren(h('span', 'spin', '◐'), ` Forging ${secs}s`);
        const detail = stage === 'rewriting' && words ? ` · ${words} words` : '';
        const slow = secs > 20 && sub('The model is working on this computer. A longer message takes longer.');
        const peek = stage === 'rewriting' && tail && h('div', 'peek', h('span', '', tail));
        say([bold(STAGE_TEXT[stage]), detail, slow, peek], { bar: true, ms: 0, actions: [{ label: 'Cancel', run: () => ((cancelled = true), job.cancel()) }] });
      };
      const job = forgeOverPort(text, strategy, (p) => {
        stage = p.stage;
        words = p.words;
        tail = p.tail;
      });
      paint();
      const timer = window.setInterval(paint, 500);
      try {
        const res = await job.done;
        if (cancelled) return void toast.classList.remove('show');
        if (!res.ok) return say([res.error], { error: true });
        // Undo always goes back to the user's own words, also after "Another way".
        original = { el, text };
        const wrote = await writeText(el, res.prompt);
        if (!wrote) {
          // The editor refused the replacement: leave the user's text alone and hand them the result.
          if (el.isConnected) await writeText(el, now);
          let copied = false;
          try {
            await navigator.clipboard.writeText(res.prompt);
            copied = true;
          } catch {
            /* clipboard blocked */
          }
          return say([copied ? 'This editor would not take the new text. It is copied: select all and press ⌘V (Ctrl+V).' : 'This editor would not take the new text.'], { error: true, ms: 12000 });
        }
        const who = res.mode === 'llm' ? ['by ', bold(res.model ?? 'your model'), ' on this computer'] : ['from ', bold('rules only')];
        const warn = res.warnings[0] && sub(res.warnings[0]);
        last = { el, original: text, prompt: res.prompt, strategy: res.strategy.id, kind: res.kind };
        const fixed = res.cleaned ? ' · spelling fixed' : '';
        say(['Rewritten for ', bold(res.targetLabel), ' ', ...who, sub('Approach: ', bold(res.strategy.name), ` · ${Math.round(res.kept * 100)}% of your details kept${fixed}`), warn], {
          actions: [
            { label: 'Another way', run: () => void run() },
            {
              label: 'Undo',
              run: () => {
                if (!original?.el.isConnected) return;
                const back = original;
                original = null;
                last = null;
                toast.classList.remove('show');
                void writeText(back.el, back.text).then(() => (updateLabel(), schedule()));
              },
            },
          ],
          ms: 20000,
        });
      } catch (err) {
        if (cancelled) toast.classList.remove('show');
        else say([err instanceof Error ? err.message : String(err)], { error: true });
      } finally {
        clearInterval(timer);
        busy = false;
        pill.disabled = false;
        pill.classList.remove('busy');
        kbd.style.display = '';
        updateLabel();
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
    document.addEventListener('input', () => (updateLabel(), schedule()), true);
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
