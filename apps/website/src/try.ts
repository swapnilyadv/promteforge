import { ANGLES, convert, getAngle, getStrategy, nextStrategy, PROFILES, STRATEGIES, type RequestKind, type StrategyId, type Target } from '@promptforge/core';

/**
 * The "write here, get a prompt" box on the landing page and the phone app. Runs entirely in the visitor's browser
 * with the rules engine: nothing is sent anywhere, and no key or model is needed.
 */
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const input = $<HTMLTextAreaElement>('try-input');
const out = $<HTMLElement>('try-out');
const meta = $<HTMLElement>('try-meta');
const go = $<HTMLButtonElement>('try-go');
const copy = $<HTMLButtonElement>('try-copy');
const target = $<HTMLSelectElement>('try-target');
const another = document.getElementById('try-another') as HTMLButtonElement | null;
const typePick = document.getElementById('try-type') as HTMLSelectElement | null;
const focusPick = document.getElementById('try-focus') as HTMLSelectElement | null;

for (const [id, p] of Object.entries(PROFILES)) {
  if (id === 'image') continue;
  target.add(new Option(p.label, id));
}
target.value = 'chatgpt';

if (typePick) {
  typePick.add(new Option('Best fit (auto)', 'auto'));
  for (const s of STRATEGIES) typePick.add(new Option(s.name, s.id));
}
if (focusPick) {
  focusPick.add(new Option('None', ''));
  for (const [label, kind] of [['For something to build', 'project'], ['For a task', 'task']] as const) {
    const group = document.createElement('optgroup');
    group.label = label;
    for (const a of ANGLES.filter((x) => x.kind === kind)) group.append(new Option(a.name, a.id));
    focusPick.append(group);
  }
}

let last = '';
/** The message the current prompt came from: "Another way" and the pickers start again from it. */
let source = '';
let strategy: StrategyId = 'spec';
let kind: RequestKind = 'task';
/** How many times "Another way" was pressed for this message: each press is a new type and a new focus. */
let variant = 0;

type Mode = 'new' | 'another' | 'picked';

function run(mode: Mode = 'new') {
  const text = (mode === 'new' ? input.value : source).trim();
  if (!text) {
    meta.textContent = 'Type something first, even a few rough words.';
    return;
  }
  if (mode === 'new') {
    source = text;
    variant = 0;
  }
  const picked = (typePick?.value ?? 'auto') as StrategyId | 'auto';
  const opts =
    mode === 'another'
      ? { strategy: nextStrategy(strategy, kind), variant: variant + 1 }
      : { strategy: picked, variant, angle: focusPick?.value || undefined };
  const r = convert({ text, target: target.value as Target, style: 'balanced', ...opts });
  // convert() is async when a provider is passed; without one the result is synchronous.
  void Promise.resolve(r).then((res) => {
    last = res.prompt;
    kind = res.kind;
    strategy = res.strategy;
    variant = res.variant;
    out.textContent = res.prompt;
    // Show what this version is, so the user can keep it or pick something else.
    if (mode === 'another') {
      if (typePick) typePick.value = res.strategy;
      if (focusPick) focusPick.value = res.angle?.id ?? '';
    }
    const kept = Math.round(res.validation.keywordRecall * 100);
    const focus = res.angle ? ` · focus: ${getAngle(res.angle.id)?.name}` : '';
    meta.textContent = `Rules-based, on this device · ${getStrategy(res.strategy).name}${focus} · ${res.kind === 'project' ? 'project' : res.intent} · ${kept}% of your key words kept${res.cleaned ? ' · spelling fixed' : ''}${mode === 'another' ? ` · version ${res.variant + 1}` : ''}`;
    out.classList.remove('empty');
    copy.disabled = false;
    if (another) another.disabled = false;
  });
}

go.addEventListener('click', () => run());
another?.addEventListener('click', () => run('another'));
// Picking a type or focus rewrites the current message straight away.
for (const pick of [typePick, focusPick]) pick?.addEventListener('change', () => source && run('picked'));

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
